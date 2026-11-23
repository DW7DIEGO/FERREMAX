import json
from contextlib import closing
import os
from pathlib import Path
import sqlite3
from datetime import datetime


USER_SELECT = '''SELECT u.Id_Usuario AS id_usuario, u.Nombre AS nombre,
    '' AS apellido, u.Correo AS email, u.Password_Hash AS password_hash,
    r.Nombre_Rol AS rol, (u.Estado='activo') AS activo,
    u.Fecha_Creacion AS fecha_creacion, u.Ultimo_Acceso AS ultimo_acceso
    FROM Usuario u JOIN Rol r ON r.Id_Rol=u.Id_Rol'''

PRODUCT_SELECT = '''SELECT p.Id_Producto AS id_producto, p.Nombre AS nombre,
    p.Codigo AS codigo, c.Nombre AS categoria, p.Subcategoria AS subcategoria,
    p.Marca AS marca, p.Precio AS precio, p.Precio_Anterior AS precio_anterior,
    p.Calificacion AS calificacion, p.Num_Resenas AS num_resenas,
    i.Stock_Total AS stock, p.Es_Nuevo AS es_nuevo, p.En_Oferta AS en_oferta,
    p.Imagen AS imagen, p.Imagenes AS imagenes, p.Descripcion_Corta AS descripcion_corta,
    p.Descripcion AS descripcion, (p.Estado_Publicacion='activo') AS activo
    FROM Producto p JOIN Categoria c ON c.Id_Categoria=p.Id_Categoria
    JOIN Inventario i ON i.Id_Producto=p.Id_Producto'''

ORDER_SELECT = '''SELECT p.Id_Pedido AS id_pedido, p.Fecha AS fecha_pedido,
    p.Total AS total, p.Estado AS estado, u.Nombre AS nombre, u.Correo AS email,
    u.Id_Usuario AS id_usuario, COALESCE(d.Direccion,'') AS direccion,
    COALESCE(d.Ciudad,'') AS ciudad, COALESCE(p.Telefono_Contacto,'') AS telefono,
    COALESCE(e.Metodo,'standard') AS envio, COALESCE(e.Tarifa,0) AS costo_envio,
    (SELECT COALESCE(SUM(Cantidad),0) FROM Detalle_Pedido WHERE Id_Pedido=p.Id_Pedido) AS unidades
    FROM Pedido p JOIN Cliente c ON c.Id_Cliente=p.Id_Cliente
    JOIN Usuario u ON u.Id_Usuario=c.Id_Usuario
    LEFT JOIN Direccion d ON d.Id_Direccion=p.Id_Direccion
    LEFT JOIN Envio e ON e.Id_Pedido=p.Id_Pedido'''


def connect(path):
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def role(conn, name):
    conn.execute('INSERT OR IGNORE INTO Rol (Nombre_Rol) VALUES (?)', (name,))
    return conn.execute('SELECT Id_Rol FROM Rol WHERE Nombre_Rol=?', (name,)).fetchone()[0]


def client(conn, uid):
    conn.execute('INSERT OR IGNORE INTO Cliente (Id_Usuario) VALUES (?)', (uid,))
    return conn.execute('SELECT Id_Cliente FROM Cliente WHERE Id_Usuario=?', (uid,)).fetchone()[0]


def store(conn):
    row = conn.execute('SELECT Id_Ferreteria FROM Ferreteria ORDER BY Id_Ferreteria LIMIT 1').fetchone()
    if row:
        return row[0]
    owner = conn.execute("SELECT u.Id_Usuario FROM Usuario u JOIN Rol r ON r.Id_Rol=u.Id_Rol WHERE r.Nombre_Rol='admin' ORDER BY u.Id_Usuario LIMIT 1").fetchone()
    if not owner:
        raise ValueError('La ferreteria necesita un administrador')
    return conn.execute("INSERT INTO Ferreteria (Id_Usuario,Nombre,NIT,Estado) VALUES (?,'FerreMax','','activo')", (owner[0],)).lastrowid


def category(conn, name):
    conn.execute("INSERT OR IGNORE INTO Categoria (Nombre,Estado) VALUES (?,'activo')", (name,))
    cid = conn.execute('SELECT Id_Categoria FROM Categoria WHERE Nombre=? COLLATE NOCASE', (name,)).fetchone()[0]
    conn.execute("UPDATE Categoria SET Estado='activo' WHERE Id_Categoria=?", (cid,))
    return cid


def save_product(conn, data, pid=None, preserve_stock=False):
    cid = category(conn, data['category'])
    values = (store(conn), cid, data['name'], data.get('description'), data.get('brand'),
              data['price'], data['code'], data.get('subcategory'), data.get('oldPrice'),
              data.get('rating', 0), data.get('reviewCount', 0), int(bool(data.get('isNew'))),
              int(bool(data.get('isOnSale'))), data.get('image'),
              json.dumps(data.get('images') or ([data['image']] if data.get('image') else [])),
              data.get('shortDescription'))
    if pid is None:
        pid = conn.execute('''INSERT INTO Producto (Id_Ferreteria,Id_Categoria,Nombre,Descripcion,
            Marca,Precio,Codigo,Subcategoria,Precio_Anterior,Calificacion,Num_Resenas,Es_Nuevo,
            En_Oferta,Imagen,Imagenes,Descripcion_Corta,Estado_Publicacion)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'activo')''', values).lastrowid
        conn.execute('INSERT INTO Inventario (Id_Producto,Stock_Total) VALUES (?,?)', (pid, data.get('inStock', 0)))
    else:
        conn.execute('''UPDATE Producto SET Id_Ferreteria=?,Id_Categoria=?,Nombre=?,Descripcion=?,
            Marca=?,Precio=?,Codigo=?,Subcategoria=?,Precio_Anterior=?,Calificacion=?,Num_Resenas=?,
            Es_Nuevo=?,En_Oferta=?,Imagen=?,Imagenes=?,Descripcion_Corta=? WHERE Id_Producto=?''', values + (pid,))
        if not preserve_stock:
            conn.execute('''UPDATE Inventario SET Stock_Total=?,
                Stock_Reservable=CASE WHEN Stock_Reservable>? THEN ? ELSE Stock_Reservable END,
                Fecha_Actualizacion=CURRENT_TIMESTAMP WHERE Id_Producto=?''',
                (data.get('inStock', 0), data.get('inStock', 0), data.get('inStock', 0), pid))
    return pid


def active_cart(conn, uid):
    cid = client(conn, uid)
    conn.execute("INSERT OR IGNORE INTO Carrito (Id_Cliente,Estado) VALUES (?,'activo')", (cid,))
    return conn.execute("SELECT Id_Carrito FROM Carrito WHERE Id_Cliente=? AND Estado='activo'", (cid,)).fetchone()[0]


def write_preferences(conn, uid, data):
    cart = active_cart(conn, uid)
    conn.execute('DELETE FROM Detalle_Carrito WHERE Id_Carrito=?', (cart,))
    quantities = {}
    for item in data['cart']:
        quantities[item['id']] = quantities.get(item['id'], 0) + item['quantity']
    for pid, qty in quantities.items():
        product = conn.execute("SELECT Precio FROM Producto WHERE Id_Producto=? AND Estado_Publicacion='activo'", (pid,)).fetchone()
        if not product:
            continue
        conn.execute('INSERT INTO Detalle_Carrito (Id_Carrito,Id_Producto,Cantidad,Precio_Unitario) VALUES (?,?,?,?)', (cart, pid, min(qty, 1000), product[0]))
    conn.execute('DELETE FROM Favorito WHERE Id_Usuario=?', (uid,))
    for pid in set(data['wishlist']):
        conn.execute('INSERT OR IGNORE INTO Favorito SELECT ?,Id_Producto FROM Producto WHERE Id_Producto=?', (uid, pid))
    conn.execute('INSERT OR REPLACE INTO Preferencia_Usuario (Id_Usuario) VALUES (?)', (uid,))


def read_preferences(conn, uid, serialize):
    if not conn.execute('SELECT 1 FROM Preferencia_Usuario WHERE Id_Usuario=?', (uid,)).fetchone():
        return None
    rows = conn.execute(PRODUCT_SELECT + ''' JOIN Detalle_Carrito dc ON dc.Id_Producto=p.Id_Producto
        JOIN Carrito ca ON ca.Id_Carrito=dc.Id_Carrito JOIN Cliente cl ON cl.Id_Cliente=ca.Id_Cliente
        WHERE cl.Id_Usuario=? AND ca.Estado='activo' AND p.Estado_Publicacion='activo' ''', (uid,)).fetchall()
    quantities = dict(conn.execute('''SELECT dc.Id_Producto,dc.Cantidad FROM Detalle_Carrito dc
        JOIN Carrito ca ON ca.Id_Carrito=dc.Id_Carrito JOIN Cliente cl ON cl.Id_Cliente=ca.Id_Cliente
        WHERE cl.Id_Usuario=? AND ca.Estado='activo' ''', (uid,)))
    return {'cart': [dict(serialize(p), quantity=quantities[p['id_producto']]) for p in rows],
            'wishlist': [r[0] for r in conn.execute('SELECT Id_Producto FROM Favorito WHERE Id_Usuario=? ORDER BY Id_Producto', (uid,))]}


def record_sale(conn, order_id, uid, total):
    row = conn.execute('SELECT Id_Venta FROM Venta WHERE Id_Pedido=?', (order_id,)).fetchone()
    if row:
        return row[0]
    sale = conn.execute("INSERT INTO Venta (Id_Pedido,Id_Usuario,Total,Estado) VALUES (?,?,?,'confirmada')", (order_id, uid, total)).lastrowid
    if total > 0:
        conn.execute("INSERT INTO Pago (Id_Venta,Metodo_Pago,Monto,Estado,Referencia,Fecha_Pago) VALUES (?,'manual',?,'confirmado','Confirmacion administrativa',CURRENT_TIMESTAMP)", (sale, total))
    return sale


def validate(conn):
    if conn.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise ValueError('La base no supera la comprobacion de integridad')
    errors = conn.execute('PRAGMA foreign_key_check').fetchall()
    if errors:
        raise ValueError('Existen relaciones invalidas: ' + str([tuple(r) for r in errors]))


def migrate_legacy(path, schema):
    source = connect(path)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    backups = path.parent / 'backups'
    backups.mkdir(exist_ok=True)
    backup = backups / ('antes_migracion_er_' + stamp + '.db')
    with closing(sqlite3.connect(backup)) as destination:
        source.backup(destination)
    # The backup is the consistent migration snapshot, even if another connection existed.
    source.close()
    source = connect(backup)
    temporary = path.with_name(path.stem + '.migrating_' + stamp + '.db')
    target = connect(temporary)
    tables = {r[0] for r in source.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    try:
        target.executescript(schema)
        with target:
            for name in ('admin', 'cliente', 'vendedor', 'domiciliario'):
                role(target, name)
            for old in source.execute('SELECT * FROM usuarios'):
                target.execute('''INSERT INTO Usuario (Id_Usuario,Id_Rol,Nombre,Correo,Password_Hash,
                    Nombre_Usuario,Estado,Fecha_Creacion,Ultimo_Acceso) VALUES (?,?,?,?,?,?,?,?,?)''',
                    (old['id_usuario'], role(target, old['rol']), (old['nombre'] + ' ' + old['apellido']).strip(),
                     old['email'], old['password_hash'], old['nombre_usuario'], 'activo' if old['activo'] else 'inactivo',
                     old['fecha_creacion'], old['ultimo_acceso']))
                client(target, old['id_usuario'])
            store(target)
            product_names = {}
            for old in source.execute('SELECT * FROM productos ORDER BY id_producto'):
                target.execute('''INSERT INTO Producto (Id_Producto,Id_Ferreteria,Id_Categoria,Nombre,
                    Descripcion,Marca,Precio,Estado_Publicacion,Codigo,Subcategoria,Precio_Anterior,
                    Calificacion,Num_Resenas,Es_Nuevo,En_Oferta,Imagen,Imagenes,Descripcion_Corta)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (old['id_producto'], store(target), category(target, old['categoria']), old['nombre'],
                     old['descripcion'], old['marca'], old['precio'], 'activo' if old['activo'] else 'inactivo',
                     old['codigo'], old['subcategoria'], old['precio_anterior'], old['calificacion'],
                     old['num_resenas'], old['es_nuevo'], old['en_oferta'], old['imagen'], old['imagenes'], old['descripcion_corta']))
                target.execute('INSERT INTO Inventario (Id_Producto,Stock_Total) VALUES (?,?)', (old['id_producto'], old['stock']))
                product_names[old['id_producto']] = old['nombre']
            for old in source.execute('SELECT * FROM pedidos ORDER BY id_pedido'):
                data = dict(old)
                cid = client(target, old['id_usuario'])
                address = None
                if data.get('direccion'):
                    address = target.execute('INSERT INTO Direccion (Id_Cliente,Direccion,Ciudad) VALUES (?,?,?)', (cid, data['direccion'], '')).lastrowid
                target.execute('INSERT INTO Pedido (Id_Pedido,Id_Cliente,Id_Direccion,Fecha,Estado,Total,Telefono_Contacto) VALUES (?,?,?,?,?,?,?)',
                    (old['id_pedido'], cid, address, old['fecha_pedido'], old['estado'], old['total'], data.get('telefono', '')))
                target.execute('INSERT INTO Envio (Id_Pedido,Metodo,Tarifa,Estado) VALUES (?,?,?,?)',
                    (old['id_pedido'], data.get('envio', 'standard'), data.get('costo_envio', 0), old['estado']))
                target.execute("INSERT INTO Historial_Pedido (Id_Pedido,Estado_Nuevo,Motivo) VALUES (?,?,'Migracion del esquema anterior')", (old['id_pedido'], old['estado']))
                if old['estado'] in ('pagado', 'enviado', 'entregado'):
                    record_sale(target, old['id_pedido'], old['id_usuario'], old['total'])
            for old in source.execute('SELECT * FROM pedido_items'):
                data = dict(old)
                target.execute('INSERT INTO Detalle_Pedido (Id_Detalle_Pedido,Id_Pedido,Id_Producto,Cantidad,Precio_Unitario,Nombre_Producto) VALUES (?,?,?,?,?,?)',
                    (old['id_item'], old['id_pedido'], old['id_producto'], old['cantidad'], old['precio_unit'], data.get('nombre_producto') or product_names[old['id_producto']]))
            if 'sesiones' in tables:
                for old in source.execute('SELECT * FROM sesiones'):
                    target.execute('INSERT INTO Sesion (Id_Sesion,Token_Hash,Id_Usuario,Creada_En,Expira_En) VALUES (?,?,?,?,?)', tuple(old))
            if 'configuracion' in tables:
                for old in source.execute('SELECT * FROM configuracion'):
                    target.execute('INSERT INTO Configuracion VALUES (?,?)', tuple(old))
            if 'actividad' in tables:
                for old in source.execute('SELECT * FROM actividad'):
                    if target.execute('SELECT 1 FROM Usuario WHERE Id_Usuario=?', (old['usuario'],)).fetchone():
                        target.execute('INSERT INTO Bitacora (Id_Bitacora,Id_Usuario,Accion,Fecha_Hora) VALUES (?,?,?,?)', (old['id'], old['usuario'], old['accion'], old['fecha']))
            if 'preferencias' in tables:
                for old in source.execute('SELECT * FROM preferencias'):
                    write_preferences(target, old['usuario'], json.loads(old['datos']))
            validate(target)
        for old_name, new_name in [('usuarios', 'Usuario'), ('productos', 'Producto'), ('pedidos', 'Pedido'), ('pedido_items', 'Detalle_Pedido')]:
            if source.execute('SELECT COUNT(*) FROM ' + old_name).fetchone()[0] != target.execute('SELECT COUNT(*) FROM ' + new_name).fetchone()[0]:
                raise ValueError('No coincide el conteo migrado de ' + old_name)
        target.close()
        source.close()
        os.replace(temporary, path)
        print('[migracion] Modelo ER integrado. Copia anterior:', backup)
    except Exception:
        target.close()
        source.close()
        if temporary.exists():
            temporary.unlink()
        raise


def initialize(path, root, hash_password):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    schema = (root / 'database' / 'schema.sql').read_text(encoding='utf-8')
    conn = connect(path)
    legacy = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='usuarios'").fetchone()
    conn.close()
    if legacy:
        migrate_legacy(path, schema)
    conn = connect(path)
    try:
        conn.executescript(schema)
        with conn:
            for name in ('admin', 'cliente', 'vendedor', 'domiciliario'):
                role(conn, name)
            if not conn.execute(USER_SELECT + " WHERE r.Nombre_Rol='admin'").fetchone():
                email = os.environ.get('FERREMAX_ADMIN_EMAIL', 'admin@ferremax.local').strip().lower()
                password = os.environ.get('FERREMAX_ADMIN_PASSWORD')
                generated = not password
                if generated:
                    import secrets
                    password = secrets.token_urlsafe(12)
                conn.execute("INSERT INTO Usuario (Id_Rol,Nombre,Correo,Password_Hash,Estado) VALUES (?,'Administrador FerreMax',?,?,'activo')", (role(conn, 'admin'), email, hash_password(password)))
                print('[setup] Administrador creado:', email)
                if generated:
                    print('[setup] Clave temporal (se muestra una sola vez):', password)
            store(conn)
            if not conn.execute('SELECT 1 FROM Producto LIMIT 1').fetchone():
                seed = root / 'server' / 'seed' / 'products.json'
                if seed.exists():
                    for data in json.loads(seed.read_text(encoding='utf-8')):
                        save_product(conn, data)
            validate(conn)
    finally:
        conn.close()
