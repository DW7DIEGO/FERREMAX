"""
FerreMax - API REST (Python estandar + SQLite, sin dependencias externas).

El contrato de la API esta documentado en docs/API.md. La futura version en PHP
debe respetar exactamente las mismas rutas y los mismos JSON, asi el frontend no cambia.
"""
import hashlib
import database
import hmac
import json
import math
import os
import re
import secrets
import sqlite3
import sys
import time
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent


# ----------------------------------------------------------------------------
# Configuracion (variables de entorno o archivo server/.env)
# ----------------------------------------------------------------------------
def load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(BASE_DIR / ".env")

DB_PATH = Path(os.environ.get("FERREMAX_DB", BASE_DIR / "ferreteria.db"))
PORT = int(os.environ.get("FERREMAX_PORT", "8000"))
SESSION_HOURS = int(os.environ.get("FERREMAX_SESSION_HOURS", "12"))
CORS_ORIGINS = {
    o.strip()
    for o in os.environ.get(
        "FERREMAX_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
    if o.strip()
}
MAX_BODY = 1_000_000  # 1 MB
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ----------------------------------------------------------------------------
# Contrasenas: PBKDF2-HMAC-SHA256 con sal. Se eligio este algoritmo porque PHP lo verifica
# de forma nativa (hash_pbkdf2), asi las cuentas seguiran funcionando al migrar a PHP.
# Formato guardado: pbkdf2_sha256$iteraciones$sal_hex$hash_hex
# ----------------------------------------------------------------------------
PBKDF2_ITERATIONS = 600_000  # recomendacion OWASP para PBKDF2-HMAC-SHA256


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt_hex, digest_hex = stored.split("$")
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
            return hmac.compare_digest(digest.hex(), digest_hex)
        except (ValueError, TypeError):
            return False
    # Hash antiguo (SHA-256 sin sal): solo se acepta para migrar la cuenta en el primer login
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy, stored)


def needs_rehash(stored: str) -> bool:
    return not stored.startswith("pbkdf2_sha256$")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ----------------------------------------------------------------------------
# Base de datos
# ----------------------------------------------------------------------------
def get_db():
    return database.connect(DB_PATH)


def setup_database():
    database.initialize(DB_PATH, ROOT_DIR, hash_password)


def sync_catalog():
    setup_database()
    conn = get_db()
    try:
        with conn:
            for data in json.loads((BASE_DIR / 'seed' / 'products.json').read_text(encoding='utf-8')):
                old = conn.execute('SELECT Id_Producto FROM Producto WHERE Codigo=?', (data['code'],)).fetchone()
                database.save_product(conn, data, old[0] if old else None, preserve_stock=True)
        print('[catalogo] Catalogo sincronizado; stock existente conservado')
    finally:
        conn.close()


def reset_password(email):
    """Cambia la clave de un usuario desde la consola: python app.py --reset-password correo@ejemplo.com"""
    import getpass
    setup_database()
    conn = get_db()
    user = conn.execute("SELECT Id_Usuario AS id_usuario FROM Usuario WHERE Correo = ?", (email.strip().lower(),)).fetchone()
    if not user:
        print(f"No existe ningun usuario con el correo {email}")
        return
    password = getpass.getpass("Nueva contrasena (minimo 8 caracteres): ")
    if len(password) < 8 or password != getpass.getpass("Repite la contrasena: "):
        print("Las contrasenas no coinciden o son demasiado cortas. No se cambio nada.")
        return
    conn.execute("UPDATE Usuario SET Password_Hash = ? WHERE Id_Usuario = ?", (hash_password(password), user["id_usuario"]))
    conn.execute("DELETE FROM Sesion WHERE Id_Usuario = ?", (user["id_usuario"],))  # cierra sus sesiones abiertas
    conn.commit()
    conn.close()
    print("Contrasena cambiada y sesiones anteriores cerradas.")


def product_to_json(row):
    images = json.loads(row["imagenes"]) if row["imagenes"] else [row["imagen"]]
    return {
        "id": row["id_producto"],
        "name": row["nombre"],
        "code": row["codigo"],
        "category": row["categoria"],
        "subcategory": row["subcategoria"],
        "brand": row["marca"],
        "price": row["precio"],
        "oldPrice": row["precio_anterior"],
        "rating": row["calificacion"],
        "reviewCount": row["num_resenas"],
        "inStock": row["stock"],
        "isNew": bool(row["es_nuevo"]),
        "isOnSale": bool(row["en_oferta"]),
        "image": row["imagen"],
        "images": images,
        "shortDescription": row["descripcion_corta"],
        "description": row["descripcion"],
    }


# ----------------------------------------------------------------------------
# Limite de intentos de login (en memoria)
# ----------------------------------------------------------------------------
_attempts = {}
MAX_ATTEMPTS, WINDOW = 5, 15 * 60


def too_many_attempts(key):
    now = time.time()
    recent = [t for t in _attempts.get(key, []) if now - t < WINDOW]
    _attempts[key] = recent
    return len(recent) >= MAX_ATTEMPTS


def register_failure(key):
    _attempts.setdefault(key, []).append(time.time())


# ----------------------------------------------------------------------------
# Manejador HTTP
# ----------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def serve_public(self):
        from urllib.parse import unquote
        path = unquote(urlparse(self.path).path)
        target = (ROOT_DIR / path.lstrip('/')).resolve()
        allowed = {'html': {'.html'}, 'css': {'.css'}, 'js': {'.js'},
                   'fonts': {'.woff2'}, 'img': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.ico', '.svg'}}
        try:
            relative = target.relative_to(ROOT_DIR)
        except ValueError:
            return self.send_error(404)
        if path == '/':
            self.path = '/index.html'
        elif relative.as_posix() != 'index.html' and not (
            len(relative.parts) > 1 and relative.parts[0] in allowed
            and target.suffix.lower() in allowed[relative.parts[0]]
            and not any(part.startswith('.') for part in relative.parts)
        ):
            return self.send_error(404)
        if target.is_dir() and path != '/':
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        self.send_error(405)

    server_version = "FerreMax"
    sys_version = ""

    # -- utilidades ---------------------------------------------------------
    def cors_headers(self):
        origin = self.headers.get("Origin")
        if origin and origin in CORS_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            raise ApiError(400, "No se enviaron datos")
        if length > MAX_BODY:
            raise ApiError(413, "Solicitud demasiado grande")
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ApiError(400, "JSON invalido")
        if not isinstance(data, dict):
            raise ApiError(400, "JSON invalido")
        return data

    def current_user(self, conn, required=True, admin=False):
        auth = self.headers.get('Authorization', '')
        user = None
        if auth.startswith('Bearer '):
            user = conn.execute(database.USER_SELECT + " JOIN Sesion s ON s.Id_Usuario=u.Id_Usuario\n                WHERE s.Token_Hash=? AND s.Expira_En>? AND u.Estado='activo' ",
                (hash_token(auth[7:].strip()), datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S'))).fetchone()
        if required and user is None:
            raise ApiError(401, 'Debes iniciar sesion')
        if admin and (user is None or user['rol'] != 'admin'):
            raise ApiError(403, 'No tienes permisos para esta accion')
        return user

    @staticmethod
    def user_json(u):
        return {
            "id": u["id_usuario"],
            "name": f"{u['nombre']} {u['apellido']}".strip(),
            "email": u["email"],
            "role": u["rol"],
            "isAdmin": u["rol"] == "admin",
        }

    # -- despacho -----------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if not urlparse(self.path).path.startswith("/api/"):
            return self.serve_public()
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")

    def do_PUT(self):
        self.dispatch("PUT")

    def do_DELETE(self):
        self.dispatch("DELETE")

    def dispatch(self, method):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        try:
            if not path.startswith("/api/"):
                raise ApiError(404, "No encontrado")
            route = path[5:]
            conn = get_db()
            try:
                self.route(method, route, query, conn)
            finally:
                conn.close()
        except ApiError as e:
            self.send_json({"error": e.message}, e.status)
        except Exception as e:  # no filtrar detalles internos al cliente
            print(f"[error] {method} {self.path}: {e!r}", file=sys.stderr)
            self.send_json({"error": "Error interno del servidor"}, 500)

    def route(self, method, route, query, conn):
        parts = route.split("/")
        head = parts[0]
        pid = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None

        if route == "login" and method == "POST":
            return self.handle_login(conn)
        if route == "register" and method == "POST":
            return self.handle_register(conn)
        if route == "logout" and method == "POST":
            return self.handle_logout(conn)
        if route == "me" and method == "GET":
            return self.send_json({"user": self.user_json(self.current_user(conn))})
        if route == "settings" and method == "GET":
            return self.send_json({'settings': self.settings(conn)})
        if route == "preferences":
            user = self.current_user(conn)
            if method == 'GET':
                return self.send_json({'preferences': database.read_preferences(conn, user['id_usuario'], product_to_json)})
            if method == 'PUT':
                data = self.read_json()
                if not isinstance(data.get('cart'), list) or not isinstance(data.get('wishlist'), list):
                    raise ApiError(400, 'Preferencias invalidas')
                if len(data['cart']) > 1000 or len(data['wishlist']) > 1000:
                    raise ApiError(400, 'Demasiados productos')
                for item in data['cart']:
                    if not isinstance(item, dict) or type(item.get('id')) is not int or type(item.get('quantity')) is not int or not 1 <= item['quantity'] <= 1000:
                        raise ApiError(400, 'Carrito invalido')
                if any(type(i) is not int or i <= 0 for i in data['wishlist']):
                    raise ApiError(400, 'Favoritos invalidos')
                database.write_preferences(conn, user['id_usuario'], data)
                conn.commit()
                return self.send_json({'saved': True})
        if route == "categories" and method == "GET":
            rows = conn.execute("SELECT DISTINCT c.Nombre FROM Categoria c JOIN Producto p ON p.Id_Categoria=c.Id_Categoria WHERE p.Estado_Publicacion='activo' ORDER BY c.Nombre")
            return self.send_json({"categories": [r[0] for r in rows]})
        if head == "products":
            if len(parts) == 1:
                if method == "GET":
                    return self.list_products(conn, query)
                if method == "POST":
                    return self.save_product(conn, None)
            elif pid is not None and len(parts) == 2:
                if method == "GET":
                    return self.get_product(conn, pid)
                if method == "PUT":
                    return self.save_product(conn, pid)
                if method == "DELETE":
                    return self.delete_product(conn, pid)
        if head == "orders" and len(parts) == 1:
            if method == "POST":
                return self.create_order(conn)
            if method == "GET":
                return self.list_orders(conn)
        if head == "admin":
            return self.route_admin(method, parts, conn)
        raise ApiError(404, "Endpoint no encontrado")

    def route_admin(self, method, parts, conn):
        admin = self.current_user(conn, admin=True)
        sub = parts[1] if len(parts) > 1 else ''
        if sub == 'store' and len(parts) == 2:
            sid = database.store(conn)
            if method == 'PUT':
                data = self.read_json()
                limits = {'name': 150, 'nit': 30, 'phone': 30, 'address': 255, 'city': 100, 'description': 2000}
                if any(not isinstance(data.get(k), str) or len(data[k]) > limit for k, limit in limits.items()) or not data['name'].strip():
                    raise ApiError(400, 'Datos de ferreteria invalidos')
                with conn:
                    conn.execute('UPDATE Ferreteria SET Nombre=?,NIT=?,Telefono=?,Direccion=?,Ciudad=?,Descripcion=? WHERE Id_Ferreteria=?', tuple(data[k].strip() for k in limits) + (sid,))
                    self.audit(conn, 'Actualizar datos de la ferreteria', 'Ferreteria', sid)
            if method in ('GET', 'PUT'):
                row = conn.execute("SELECT Nombre AS name,NIT AS nit,COALESCE(Telefono,'') AS phone,COALESCE(Direccion,'') AS address,COALESCE(Ciudad,'') AS city,COALESCE(Descripcion,'') AS description FROM Ferreteria WHERE Id_Ferreteria=?", (sid,)).fetchone()
                return self.send_json({'store': dict(row)})
        if sub == 'settings' and method == 'PUT'  and len(parts) == 2:
            data = self.read_json()
            for key in ('standard', 'express', 'freeFrom'):
                value = data.get(key)
                if type(value) is not int or not 0 <= value <= 10000000:
                    raise ApiError(400, 'Tarifas invalidas')
            with conn:
                for key in ('standard', 'express', 'freeFrom'):
                    conn.execute('INSERT OR REPLACE INTO Configuracion VALUES (?,?)', (key, str(data[key])))
                self.audit(conn, 'Actualizar tarifas de envio', 'Configuracion')
            return self.send_json({'settings': self.settings(conn)})
        if sub == 'activity' and method == 'GET' and len(parts) == 2:
            rows = conn.execute('SELECT b.Id_Bitacora AS id,b.Accion AS accion,b.Fecha_Hora AS fecha,u.Correo AS email FROM Bitacora b JOIN Usuario u ON u.Id_Usuario=b.Id_Usuario ORDER BY b.Id_Bitacora DESC LIMIT 100').fetchall()
            return self.send_json({'activity': [dict(r) for r in rows]})
        if sub == 'categories' and method == 'PUT' and len(parts) == 2:
            data = self.read_json()
            if not isinstance(data.get('old'), str) or not isinstance(data.get('name'), str):
                raise ApiError(400, 'Categoria invalida')
            old, new = data['old'].strip(), data['name'].strip().lower()
            if not old or not new or len(new) > 50:
                raise ApiError(400, 'Categoria invalida')
            current = conn.execute('SELECT Id_Categoria FROM Categoria WHERE Nombre=? COLLATE NOCASE', (old,)).fetchone()
            if not current:
                raise ApiError(404, 'Categoria no encontrada')
            with conn:
                destination = database.category(conn, new)
                conn.execute('UPDATE Producto SET Id_Categoria=? WHERE Id_Categoria=?', (destination, current[0]))
                if destination != current[0]:
                    conn.execute("UPDATE Categoria SET Estado='inactivo' WHERE Id_Categoria=?", (current[0],))
                self.audit(conn, 'Renombrar categoria: ' + old + ' -> ' + new, 'Categoria', destination)
            return self.send_json({'saved': True})
        if sub == 'orders' and method == 'GET' and len(parts) == 3 and parts[2].isdigit():
            row = conn.execute(database.ORDER_SELECT + ' WHERE p.Id_Pedido=?', (int(parts[2]),)).fetchone()
            if not row:
                raise ApiError(404, 'Pedido no encontrado')
            items = conn.execute('SELECT COALESCE(d.Nombre_Producto,p.Nombre) AS nombre,d.Cantidad AS cantidad,d.Precio_Unitario AS precio_unit FROM Detalle_Pedido d JOIN Producto p ON p.Id_Producto=d.Id_Producto WHERE d.Id_Pedido=?', (int(parts[2]),)).fetchall()
            history = conn.execute('SELECT Estado_Anterior AS anterior,Estado_Nuevo AS nuevo,Fecha_Cambio AS fecha,Motivo AS motivo FROM Historial_Pedido WHERE Id_Pedido=? ORDER BY Id_Historial', (int(parts[2]),)).fetchall()
            return self.send_json({'order': dict(row), 'items': [dict(i) for i in items], 'history': [dict(h) for h in history]})
        if sub == 'pos' and method == 'POST' and len(parts) == 2:
            return self.create_order(conn, cashier=admin)
        if sub == 'stats' and method == 'GET' and len(parts) == 2:
            return self.admin_stats(conn)
        if sub == 'orders' and method == 'GET' and len(parts) == 2:
            return self.admin_orders(conn)
        if sub == 'orders' and method == 'PUT' and len(parts) == 3 and parts[2].isdigit():
            return self.admin_update_order(conn, int(parts[2]))
        if sub == 'customers' and method == 'GET' and len(parts) == 2:
            return self.admin_customers(conn)
        raise ApiError(404, 'Endpoint no encontrado')

    # -- autenticacion ------------------------------------------------------
    def handle_register(self, conn):
        data = self.read_json()
        if not all(isinstance(data.get(k), str) for k in ('name', 'email', 'password')):
            raise ApiError(400, "Nombre, correo y contrasena deben ser texto")
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        if not name or not email or not password:
            raise ApiError(400, "Nombre, correo y contrasena son obligatorios")
        if not EMAIL_RE.match(email) or len(email) > 100:
            raise ApiError(400, "Correo electronico invalido")
        if len(password) < 8:
            raise ApiError(400, "La contrasena debe tener al menos 8 caracteres")
        if len(name) > 100:
            raise ApiError(400, "Nombre demasiado largo")
        username = "cliente_" + secrets.token_hex(16)
        try:
            uid = conn.execute("INSERT INTO Usuario (Nombre_Usuario,Correo,Password_Hash,Nombre,Id_Rol,Estado) VALUES (?,?,?,?,?,'activo')", (username, email, hash_password(password), name, database.role(conn, 'cliente'))).lastrowid
            database.client(conn, uid)
            conn.commit()
        except sqlite3.IntegrityError:
            raise ApiError(409, "El correo o el nombre de usuario ya esta registrado")
        self.send_json({"message": "Registro exitoso"}, 201)

    def handle_login(self, conn):
        data = self.read_json()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        if not email or not password:
            raise ApiError(400, "Correo y contrasena requeridos")
        key = f"{self.client_address[0]}|{email}"
        if too_many_attempts(key):
            raise ApiError(429, "Demasiados intentos. Intenta de nuevo en unos minutos")
        user = conn.execute(database.USER_SELECT + " WHERE u.Correo=? AND u.Estado='activo'", (email,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            register_failure(key)
            raise ApiError(401, "Credenciales invalidas")
        _attempts.pop(key, None)
        if needs_rehash(user["password_hash"]):
            conn.execute("UPDATE Usuario SET Password_Hash = ? WHERE Id_Usuario = ?",
                         (hash_password(password), user["id_usuario"]))
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
        conn.execute("DELETE FROM Sesion WHERE Expira_En < ?",
                     (datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),))
        conn.execute("INSERT INTO Sesion (Token_Hash, Id_Usuario, Expira_En) VALUES (?,?,?)",
                     (hash_token(token), user["id_usuario"], expires.strftime("%Y-%m-%d %H:%M:%S")))
        conn.execute("UPDATE Usuario SET Ultimo_Acceso = CURRENT_TIMESTAMP WHERE Id_Usuario = ?", (user["id_usuario"],))
        conn.commit()
        self.send_json({"user": self.user_json(user), "token": token, "expiresAt": expires.isoformat()})

    def handle_logout(self, conn):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            conn.execute("DELETE FROM Sesion WHERE Token_Hash = ?", (hash_token(auth[7:].strip()),))
            conn.commit()
        self.send_json({"message": "Sesion cerrada"})

    # -- productos ----------------------------------------------------------
    def list_products(self, conn, q):
        sql, args = "SELECT * FROM (" + database.PRODUCT_SELECT + ") WHERE activo=1", []
        if q.get("category"):
            sql += " AND categoria = ?"; args.append(q["category"])
        if q.get("brand"):
            sql += " AND LOWER(marca) = ?"; args.append(q["brand"].lower())
        if q.get("max_price"):
            try:
                sql += " AND precio <= ?"; args.append(float(q["max_price"]))
            except ValueError:
                raise ApiError(400, "max_price invalido")
        if q.get("search"):
            sql += " AND (LOWER(nombre) LIKE ? OR LOWER(descripcion_corta) LIKE ?)"
            like = f"%{q['search'].lower()}%"; args += [like, like]
        if q.get("promo") in ("1", "true"):
            sql += " AND en_oferta = 1"
        order = {"price-low": "precio ASC", "price-high": "precio DESC",
                 "name-asc": "nombre ASC", "name-desc": "nombre DESC"}.get(q.get("sort"), "id_producto ASC")
        rows = conn.execute(f"{sql} ORDER BY {order}", args).fetchall()
        self.send_json({"products": [product_to_json(r) for r in rows]})

    def get_product(self, conn, pid):
        row = conn.execute(database.PRODUCT_SELECT + " WHERE p.Id_Producto=? AND p.Estado_Publicacion='activo'", (pid,)).fetchone()
        if not row:
            raise ApiError(404, "Producto no encontrado")
        self.send_json({"product": product_to_json(row)})

    def save_product(self, conn, pid):
        self.current_user(conn, admin=True)
        d = self.read_json()
        try:
            name = str(d["name"]).strip(); code = str(d["code"]).strip()
            category = str(d["category"]).strip(); price = float(d["price"])
            raw_stock = d.get("inStock", 0)
            if type(raw_stock) is not int:
                raise ValueError('Stock debe ser entero')
            stock = raw_stock
            old_price = d.get('oldPrice')
            if old_price is not None:
                old_price = float(old_price)
                if not math.isfinite(old_price) or old_price < 0 or old_price != int(old_price):
                    raise ValueError('Precio anterior invalido')
        except (KeyError, ValueError, TypeError):
            raise ApiError(400, "Faltan campos obligatorios o son invalidos (name, code, category, price)")
        if not name or not code or not category or not math.isfinite(price) or price < 0 or price != int(price) or stock < 0:
            raise ApiError(400, "Datos de producto invalidos")
        d.update(name=name, code=code, category=category.lower(), price=price, oldPrice=old_price, inStock=stock)
        if len(name) > 150 or len(code) > 50 or len(category) > 50:
            raise ApiError(400, 'Nombre, codigo o categoria demasiado largos')
        previous = conn.execute('SELECT Stock_Total FROM Inventario WHERE Id_Producto=?', (pid,)).fetchone() if pid else None
        if pid is not None and not previous:
            raise ApiError(404, 'Producto no encontrado')
        try:
            with conn:
                pid = database.save_product(conn, d, pid)
                delta = stock - (previous[0] if previous else 0)
                if delta:
                    admin = self.current_user(conn, admin=True)
                    conn.execute('INSERT INTO Movimiento_Inventario (Id_Producto,Id_Usuario,Tipo_Movimiento,Cantidad,Motivo) VALUES (?,?,?,?,?)', (pid, admin['id_usuario'], 'entrada' if delta > 0 else 'salida', abs(delta), 'Ajuste administrativo'))
                self.audit(conn, 'Guardar producto #' + str(pid), 'Producto', pid)
        except sqlite3.IntegrityError:
            raise ApiError(409, 'Codigo duplicado o datos de producto invalidos')
        row = conn.execute(database.PRODUCT_SELECT + ' WHERE p.Id_Producto=?', (pid,)).fetchone()
        self.send_json({'product': product_to_json(row)}, 200 if previous else 201)

    def delete_product(self, conn, pid):
        self.current_user(conn, admin=True)
        with conn:
            cur = conn.execute("UPDATE Producto SET Estado_Publicacion='inactivo' WHERE Id_Producto=?", (pid,))
            if not cur.rowcount:
                raise ApiError(404, 'Producto no encontrado')
            self.audit(conn, 'Eliminar producto #' + str(pid), 'Producto', pid)
        self.send_json({'message': 'Producto eliminado'})

    # -- pedidos ------------------------------------------------------------
    def create_order(self, conn, cashier=None):
        user = cashier or self.current_user(conn)
        data = self.read_json()
        items = data.get('items')
        if not isinstance(items, list) or not items or len(items) > 1000:
            raise ApiError(400, 'El pedido no tiene productos validos')
        quantities = {}
        for item in items:
            if not isinstance(item, dict):
                raise ApiError(400, 'Producto o cantidad invalidos')
            pid, qty = item.get('product_id'), item.get('quantity')
            if type(pid) is not int or type(qty) is not int or pid <= 0 or not 1 <= qty <= 1000:
                raise ApiError(400, 'Producto o cantidad invalidos')
            quantities[pid] = quantities.get(pid, 0) + qty
            if quantities[pid] > 1000:
                raise ApiError(400, 'Cantidad invalida')
        if cashier:
            key = data.get('requestId')
            customer = data.get('customer')
            rate = data.get('taxRate', 0)
            if not isinstance(key, str) or not re.fullmatch(r'[a-f0-9-]{36}', key):
                raise ApiError(400, 'Identificador de venta inválido')
            if type(customer) is not int or type(rate) not in (int, float) or not 0 <= rate <= 100:
                raise ApiError(400, 'Cliente o porcentaje de impuesto inválido')
            fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        else:
            address, phone, city = data.get('address', ''), data.get('phone', ''), data.get('city', '')
            if not isinstance(address, str) or not 5 <= len(address.strip()) <= 255 or not isinstance(phone, str) or not re.fullmatch(r'[+0-9 ()-]{7,25}', phone):
                raise ApiError(400, 'Ingresa direccion y telefono de entrega validos')
            if not isinstance(city, str) or not 2 <= len(city.strip()) <= 100:
                raise ApiError(400, 'Ingresa la ciudad de entrega')
            shipping = data.get('shipping', 'standard')
            if shipping not in ('standard', 'express', 'free'):
                raise ApiError(400, 'Metodo de envio invalido')
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            if cashier:
                previous = conn.execute('SELECT x.Huella,p.Id_Pedido,p.Total,p.Estado FROM Cobro_POS x JOIN Pedido p USING(Id_Pedido) WHERE x.Clave=? AND x.Id_Usuario=?', (key, user['id_usuario'])).fetchone()
                if previous:
                    if previous['Huella'] != fingerprint:
                        raise ApiError(409, 'El ticket ya fue registrado con otro contenido')
                    return self.send_json({'order': {'id': previous['Id_Pedido'], 'total': previous['Total'], 'status': previous['Estado']}})
                if not conn.execute(database.USER_SELECT + " WHERE u.Id_Usuario=? AND r.Nombre_Rol='cliente' AND u.Estado='activo'", (customer,)).fetchone():
                    raise ApiError(400, 'Selecciona un cliente activo')
            subtotal, lines = 0, []
            for pid, qty in quantities.items():
                product = conn.execute(database.PRODUCT_SELECT + " WHERE p.Id_Producto=? AND p.Estado_Publicacion='activo'", (pid,)).fetchone()
                if not product:
                    raise ApiError(404, 'Producto no encontrado')
                if product['stock'] < qty:
                    raise ApiError(409, 'Stock insuficiente para ' + product['nombre'])
                subtotal += product['precio'] * qty
                lines.append((product, qty))
            if cashier:
                tax = float((Decimal(str(round(subtotal, 2))) * Decimal(str(rate)) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
                total = round(subtotal + tax, 2)
                if data.get('expectedTotal') != total:
                    raise ApiError(409, 'El precio cambió. Revisa el ticket antes de cobrar.')
                cid = database.client(conn, customer)
                oid = conn.execute("INSERT INTO Pedido (Id_Cliente,Total,Estado) VALUES (?,?,'entregado')", (cid, total)).lastrowid
                sale = database.record_sale(conn, oid, user['id_usuario'], total)
                conn.execute('UPDATE Venta SET Impuesto=? WHERE Id_Venta=?', (tax, sale))
                conn.execute("INSERT INTO Envio (Id_Pedido,Metodo,Tarifa,Estado) VALUES (?,'mostrador',0,'entregado')", (oid,))
                conn.execute('INSERT INTO Cobro_POS (Clave,Id_Usuario,Huella,Id_Pedido) VALUES (?,?,?,?)', (key,user['id_usuario'],fingerprint,oid))
                self.audit(conn, 'Venta en mostrador', 'Venta', sale)
            else:
                rates = self.settings(conn)
                if shipping == 'free' and subtotal < rates['freeFrom']:
                    raise ApiError(400, 'El pedido no alcanza el minimo para envio gratis')
                shipping_cost = 0 if subtotal >= rates['freeFrom'] else rates[shipping]
                total = round(subtotal + shipping_cost, 2)
                cid = database.client(conn, user['id_usuario'])
                cart = database.active_cart(conn, user['id_usuario'])
                conn.execute('DELETE FROM Detalle_Carrito WHERE Id_Carrito=?', (cart,))
                for product, qty in lines:
                    conn.execute('INSERT INTO Detalle_Carrito (Id_Carrito,Id_Producto,Cantidad,Precio_Unitario) VALUES (?,?,?,?)', (cart, product['id_producto'], qty, product['precio']))
                aid = conn.execute('INSERT INTO Direccion (Id_Cliente,Direccion,Ciudad) VALUES (?,?,?)', (cid, address.strip(), city.strip())).lastrowid
                oid = conn.execute('INSERT INTO Pedido (Id_Cliente,Id_Carrito,Id_Direccion,Total,Telefono_Contacto) VALUES (?,?,?,?,?)', (cid, cart, aid, total, phone)).lastrowid
                conn.execute('INSERT INTO Envio (Id_Pedido,Metodo,Tarifa,Estado) VALUES (?,?,?,?)', (oid, shipping, shipping_cost, 'pendiente'))
            for product, qty in lines:
                pid = product['id_producto']
                conn.execute('INSERT INTO Detalle_Pedido (Id_Pedido,Id_Producto,Cantidad,Precio_Unitario,Nombre_Producto) VALUES (?,?,?,?,?)', (oid, pid, qty, product['precio'], product['nombre']))
                conn.execute('UPDATE Inventario SET Stock_Total=Stock_Total-?,Stock_Reservable=MIN(Stock_Reservable,Stock_Total-?),Fecha_Actualizacion=CURRENT_TIMESTAMP WHERE Id_Producto=?', (qty, qty, pid))
                conn.execute("INSERT INTO Movimiento_Inventario (Id_Producto,Id_Usuario,Id_Pedido,Tipo_Movimiento,Cantidad,Motivo) VALUES (?,?,?,'salida',?,?)", (pid, user['id_usuario'], oid, qty, 'Mostrador' if cashier else 'Pedido web'))
            status = 'entregado' if cashier else 'pendiente'
            if not cashier:
                conn.execute("UPDATE Carrito SET Estado='convertido' WHERE Id_Carrito=?", (cart,))
            conn.execute("INSERT INTO Historial_Pedido (Id_Pedido,Id_Usuario,Estado_Nuevo,Motivo) VALUES (?,?,?,?)", (oid, user['id_usuario'], status, 'Venta en mostrador' if cashier else 'Pedido creado en la web'))
        self.send_json({'order': {'id': oid, 'total': total, 'status': status}}, 201)

    def list_orders(self, conn):
        user = self.current_user(conn)
        rows = conn.execute(database.ORDER_SELECT + ' WHERE u.Id_Usuario=? ORDER BY p.Id_Pedido DESC', (user['id_usuario'],)).fetchall()
        self.send_json({'orders': [{'id': r['id_pedido'], 'date': r['fecha_pedido'], 'total': r['total'], 'status': r['estado']} for r in rows]})

    # -- administracion -----------------------------------------------------
    ORDER_STATUSES = ("pendiente", "pagado", "enviado", "entregado", "cancelado")

    def settings(self, conn):
        result = {'standard': 20000, 'express': 40000, 'freeFrom': 200000}
        for row in conn.execute('SELECT clave, valor FROM configuracion'):
            if row[0] in result:
                result[row[0]] = int(row[1])
        return result

    def audit(self, conn, action, entity=None, record=None):
        user = self.current_user(conn, admin=True)
        conn.execute('INSERT INTO Bitacora (Id_Usuario,Accion,Entidad_Afectada,Id_Registro_Afectado) VALUES (?,?,?,?)', (user['id_usuario'], action, entity, record))

    def admin_stats(self, conn):
        one = lambda sql: conn.execute(sql).fetchone()[0]
        recent = conn.execute(database.ORDER_SELECT + ' ORDER BY p.Id_Pedido DESC LIMIT 6').fetchall()
        self.send_json({'stats': {
            'todaySales': one("SELECT COALESCE(SUM(Total),0) FROM Venta WHERE Estado='confirmada' AND date(Fecha_Venta,'-5 hours')=date('now','-5 hours')"),
            'activeOrders': one("SELECT COUNT(*) FROM Pedido WHERE Estado IN ('pendiente','pagado','enviado')"),
            'sales': one("SELECT COALESCE(SUM(Total),0) FROM Venta WHERE Estado='confirmada'"),
            'orders': one('SELECT COUNT(*) FROM Pedido'),
            'pendingOrders': one("SELECT COUNT(*) FROM Pedido WHERE Estado='pendiente'"),
            'customers': one("SELECT COUNT(*) FROM Usuario u JOIN Rol r ON r.Id_Rol=u.Id_Rol WHERE r.Nombre_Rol='cliente'"),
            'products': one("SELECT COUNT(*) FROM Producto WHERE Estado_Publicacion='activo'"),
            'lowStock': one("SELECT COUNT(*) FROM Inventario i JOIN Producto p ON p.Id_Producto=i.Id_Producto WHERE p.Estado_Publicacion='activo' AND i.Stock_Total<=MAX(i.Stock_Minimo,5)"),
            'recentOrders': [{'id': r['id_pedido'], 'date': r['fecha_pedido'], 'total': r['total'], 'status': r['estado'], 'customer': r['nombre']} for r in recent]}})

    def admin_orders(self, conn):
        rows = conn.execute(database.ORDER_SELECT + ' ORDER BY p.Id_Pedido DESC').fetchall()
        self.send_json({'orders': [{'id': r['id_pedido'], 'date': r['fecha_pedido'], 'total': r['total'], 'status': r['estado'], 'units': r['unidades'], 'email': r['email'], 'customer': r['nombre']} for r in rows]})

    def admin_update_order(self, conn, order_id):
        admin = self.current_user(conn, admin=True)
        status = self.read_json().get('status')
        if status not in self.ORDER_STATUSES:
            raise ApiError(400, 'Estado invalido')
        transitions = {'pendiente': ('pagado','cancelado'), 'pagado': ('enviado','cancelado'), 'enviado': ('entregado','cancelado'), 'entregado': ('cancelado',), 'cancelado': ()}
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            order = conn.execute('SELECT Estado,Total FROM Pedido WHERE Id_Pedido=?', (order_id,)).fetchone()
            if not order:
                raise ApiError(404, 'Pedido no encontrado')
            previous = order['Estado']
            if status != previous:
                if status not in transitions[previous]:
                    raise ApiError(409, 'Cambio de estado no permitido')
                if status == 'cancelado':
                    for item in conn.execute('SELECT Id_Producto,Cantidad FROM Detalle_Pedido WHERE Id_Pedido=?', (order_id,)).fetchall():
                        conn.execute('UPDATE Inventario SET Stock_Total=Stock_Total+?,Fecha_Actualizacion=CURRENT_TIMESTAMP WHERE Id_Producto=?', (item['Cantidad'], item['Id_Producto']))
                        conn.execute("INSERT INTO Movimiento_Inventario (Id_Producto,Id_Usuario,Id_Pedido,Tipo_Movimiento,Cantidad,Motivo) VALUES (?,?,?,'entrada',?,'Cancelacion de pedido')", (item['Id_Producto'], admin['id_usuario'], order_id, item['Cantidad']))
                    conn.execute("UPDATE Venta SET Estado='cancelada' WHERE Id_Pedido=?", (order_id,))
                    conn.execute("UPDATE Pago SET Estado='anulado' WHERE Id_Venta IN (SELECT Id_Venta FROM Venta WHERE Id_Pedido=?)", (order_id,))
                if status == 'pagado':
                    database.record_sale(conn, order_id, admin['id_usuario'], order['Total'])
                conn.execute('UPDATE Pedido SET Estado=? WHERE Id_Pedido=?', (status, order_id))
                conn.execute('UPDATE Envio SET Estado=? WHERE Id_Pedido=?', (status, order_id))
                conn.execute('INSERT INTO Historial_Pedido (Id_Pedido,Id_Usuario,Estado_Anterior,Estado_Nuevo,Motivo) VALUES (?,?,?,?,?)', (order_id, admin['id_usuario'], previous, status, 'Cambio administrativo'))
                self.audit(conn, 'Pedido #' + str(order_id) + ': ' + status, 'Pedido', order_id)
        self.send_json({'order': {'id': order_id, 'status': status}})

    def admin_customers(self, conn):
        rows = conn.execute(database.USER_SELECT + ' ORDER BY u.Id_Usuario DESC').fetchall()
        self.send_json({'customers': [{'id': r['id_usuario'], 'name': r['nombre'], 'email': r['email'], 'role': r['rol'], 'active': bool(r['activo']), 'createdAt': r['fecha_creacion'], 'lastAccess': r['ultimo_acceso']} for r in rows]})

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")


def run_server(port=PORT):
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    try:
        setup_database()
    except Exception:
        httpd.server_close()
        raise
    print(f"FerreMax: http://localhost:{port}/html/home.html")
    print(f"Panel administrador: http://localhost:{port}/html/admin.html")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    if "--reset-password" in sys.argv:
        idx = sys.argv.index("--reset-password")
        if idx + 1 >= len(sys.argv):
            print("Uso: python app.py --reset-password correo@ejemplo.com")
        else:
            reset_password(sys.argv[idx + 1])
    elif "--sync-catalog" in sys.argv:
        setup_database()
        sync_catalog()
    else:
        run_server(int(sys.argv[1]) if len(sys.argv) > 1 else PORT)
