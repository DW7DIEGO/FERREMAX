from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import hashlib
import sqlite3
from urllib.parse import urlparse
import time 

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
DB_NAME = 'ferreteria.db'

# --- Hashing Utility ---
def hash_password(password):
    """Genera el hash de la contraseña de forma segura (SHA-256)."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

# --- FUNCIONES DE BASE DE DATOS ---
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# CÓDIGO CORREGIDO PARA EL ARCHIVO server/app.py

def setup_database():
    """Crea la tabla de usuarios y el usuario administrador si no existen."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Crear la tabla de usuarios si no existe
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            nombre VARCHAR(50) NOT NULL,
            apellido VARCHAR(50) NOT NULL,
            -- ¡AQUÍ ESTÁ LA CORRECCIÓN! Cambiar ENUM por VARCHAR
            rol VARCHAR(20) NOT NULL, 
            activo BOOLEAN DEFAULT 1,
            ultimo_acceso DATETIME,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    
    # 2. Insertar Usuario Administrador por defecto si no existe
    admin_email = 'dyegitalero04@gmail.com'
    admin_pass_hash = hash_password('123456789')
    
    cursor.execute('SELECT id_usuario FROM usuarios WHERE email = ?', (admin_email,))
    admin_exists = cursor.fetchone()
    
    if not admin_exists:
        cursor.execute('''
            INSERT INTO usuarios (nombre_usuario, email, password_hash, nombre, apellido, rol)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('adminferremax', admin_email, admin_pass_hash, 'Diego', 'Admin', 'admin'))
        print(f"Usuario Administrador insertado: {admin_email}")
    else:
        print(f"Base de datos persistente inicializada. Admin ya existe: {admin_email}")
        
    conn.commit()
    conn.close()

# API Handler
class APIHandler(SimpleHTTPRequestHandler):
    
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500') 
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        return SimpleHTTPRequestHandler.do_GET(self)
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith('/api/'):
            endpoint = path.replace('/api/', '')
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json_response({"error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            
            try:
                data = json.loads(post_data)
            except json.JSONDecodeError:
                self.send_json_response({"error": "Invalid JSON"}, 400)
                return
            
            if endpoint == 'login':
                self.handle_login(data)
            elif endpoint == 'register':
                self.handle_register(data)
            else:
                self.send_json_response({"error": "Endpoint not found"}, 404)
        else:
            SimpleHTTPRequestHandler.do_POST(self)
    
    # --- LÓGICA DE REGISTRO (/api/register) ---
    def handle_register(self, data):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if field not in data:
                self.send_json_response({"error": f"{field} is required"}, 400)
                return

        fullName = data['name'].strip()
        email = data['email'].strip()
        password = data['password']
        password_hash = hash_password(password)

        nameParts = fullName.split(' ', 1)
        nombre = nameParts[0] if nameParts else 'Usuario'
        apellido = nameParts[1] if len(nameParts) > 1 else 'Registrado'
        nombre_usuario = email.split('@')[0]
        
        try:
            cursor.execute('''
                INSERT INTO usuarios (nombre_usuario, email, password_hash, nombre, apellido, rol)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (nombre_usuario, email, password_hash, nombre, apellido, 'vendedor'))
            
            conn.commit()
            self.send_json_response({"message": "Registration successful"}, 201)
            
        except sqlite3.IntegrityError:
            self.send_json_response({"error": "El email o nombre de usuario ya está registrado."}, 409)
        except Exception as e:
            print(f"Database error during registration: {e}")
            self.send_json_response({"error": "Error interno del servidor"}, 500)
        finally:
            conn.close()
    
    # --- LÓGICA DE LOGIN (/api/login) ---
    def handle_login(self, data):
        if 'email' not in data or 'password' not in data:
            self.send_json_response({"error": "Email and password required"}, 400)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        email = data['email'].strip()
        password = data['password']
        hashed_password = hash_password(password)
        
        try:
            cursor.execute('SELECT * FROM usuarios WHERE email = ?', (email,))
            user_row = cursor.fetchone()
            
            if user_row:
                user = dict(user_row)
                
                if hashed_password == user['password_hash']:
                    # Login exitoso
                    user_data = {
                        "id": user['id_usuario'],
                        "name": f"{user['nombre']} {user['apellido']}", 
                        "email": user['email'],
                        "isAdmin": user['rol'] == 'admin'
                    }
                    cursor.execute('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = ?', (user['id_usuario'],))
                    conn.commit()
                    
                    self.send_json_response({"user": user_data, "token": "mock-token"})
                    return
            
            self.send_json_response({"error": "Credenciales inválidas"}, 401)
            
        except Exception as e:
            print(f"Database error during login: {e}")
            self.send_json_response({"error": "Error interno del servidor"}, 500)
        finally:
            conn.close()


# --- Inicio del Servidor ---
def run_server():
    server_address = ('', 8000) 
    class DualHandler(APIHandler):
        pass

    httpd = HTTPServer(server_address, DualHandler)
    print(f"Starting API server on http://localhost:8000")
    httpd.serve_forever()

if __name__ == '__main__':
    setup_database()
    run_server()