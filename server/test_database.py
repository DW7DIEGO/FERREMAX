import contextlib
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

import database


ROOT = Path(__file__).resolve().parent.parent
LEGACY = '''
CREATE TABLE usuarios (id_usuario INTEGER PRIMARY KEY, nombre_usuario TEXT, email TEXT,
 password_hash TEXT,nombre TEXT,apellido TEXT,rol TEXT,activo INTEGER,ultimo_acceso TEXT,fecha_creacion TEXT);
CREATE TABLE productos (id_producto INTEGER PRIMARY KEY,nombre TEXT,codigo TEXT,categoria TEXT,
 subcategoria TEXT,marca TEXT,precio INTEGER,precio_anterior INTEGER,calificacion REAL,num_resenas INTEGER,
 stock INTEGER,es_nuevo INTEGER,en_oferta INTEGER,imagen TEXT,imagenes TEXT,descripcion_corta TEXT,descripcion TEXT,activo INTEGER);
CREATE TABLE pedidos (id_pedido INTEGER PRIMARY KEY,id_usuario INTEGER,fecha_pedido TEXT,total INTEGER,
 estado TEXT,direccion TEXT,telefono TEXT,envio TEXT,costo_envio INTEGER);
CREATE TABLE pedido_items (id_item INTEGER PRIMARY KEY,id_pedido INTEGER,id_producto INTEGER,cantidad INTEGER,precio_unit INTEGER,nombre_producto TEXT);
CREATE TABLE sesiones (id_sesion INTEGER PRIMARY KEY,token_hash TEXT,id_usuario INTEGER,creada_en TEXT,expira_en TEXT);
CREATE TABLE configuracion (clave TEXT PRIMARY KEY,valor TEXT);
CREATE TABLE actividad (id INTEGER PRIMARY KEY,usuario INTEGER,accion TEXT,fecha TEXT);
CREATE TABLE preferencias (usuario INTEGER PRIMARY KEY,datos TEXT);
'''


class DatabaseTests(unittest.TestCase):
    def fixture(self, path):
        conn = sqlite3.connect(path)
        conn.executescript(LEGACY)
        conn.execute("INSERT INTO usuarios VALUES (7,'admin','admin@example.test','hash-conservado','Admin','Original','admin',1,NULL,'2026-01-01 10:00:00')")
        conn.execute("INSERT INTO usuarios VALUES (9,'ana','ana@example.test','hash-cliente','Ana','Perez','cliente',1,NULL,'2026-01-02 10:00:00')")
        conn.execute("INSERT INTO productos VALUES (11,'Taladro','P-11','herramientas',NULL,'Marca',10000,12000,4.5,3,8,1,1,'img/taladro.jpg','[\"img/taladro.jpg\"]','Corta','Completa',1)")
        conn.execute("INSERT INTO pedidos VALUES (15,9,'2026-01-03 12:00:00',40000,'pagado','Calle 10','3001234567','standard',20000)")
        conn.execute("INSERT INTO pedido_items VALUES (21,15,11,2,10000,'Taladro al comprar')")
        conn.execute("INSERT INTO sesiones VALUES (3,'token-hash',7,'2026-01-01','2099-01-01')")
        conn.execute("INSERT INTO configuracion VALUES ('standard','22000')")
        conn.execute("INSERT INTO actividad VALUES (5,7,'Accion anterior','2026-01-02')")
        conn.execute('INSERT INTO preferencias VALUES (?,?)', (9, json.dumps({'cart': [{'id':11,'quantity':1,'price':1}], 'wishlist':[11]})))
        conn.commit()
        conn.close()

    def test_schema_keeps_er_and_web_extensions(self):
        er = sqlite3.connect(':memory:')
        er.executescript((ROOT / 'database/ferremax_er_sqlite.sql').read_text(encoding='utf-8'))
        expected = {r[0] for r in er.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        conn = sqlite3.connect(':memory:')
        schema = (ROOT / 'database/schema.sql').read_text(encoding='utf-8')
        self.assertNotIn('--', schema)
        conn.executescript(schema)
        conn.executescript(schema)
        actual = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        self.assertTrue(expected.issubset(actual))
        self.assertEqual(len(actual), 31)
        self.assertEqual(conn.execute('PRAGMA user_version').fetchone()[0], 3)
        conn.close()
        er.close()

    def test_migration_preserves_data_and_is_repeatable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'legacy.db'
            self.fixture(path)
            with contextlib.redirect_stdout(io.StringIO()):
                database.initialize(path, ROOT, lambda value: self.fail('No debe cambiar la clave existente'))
                database.initialize(path, ROOT, lambda value: self.fail('No debe crear otro administrador'))
            conn = database.connect(path)
            database.validate(conn)
            user = conn.execute(database.USER_SELECT + ' WHERE u.Id_Usuario=7').fetchone()
            self.assertEqual(user['password_hash'], 'hash-conservado')
            self.assertEqual(user['nombre'], 'Admin Original')
            product = conn.execute(database.PRODUCT_SELECT).fetchone()
            self.assertEqual((product['id_producto'], product['stock'], product['imagen']), (11, 8, 'img/taladro.jpg'))
            order = conn.execute(database.ORDER_SELECT).fetchone()
            self.assertEqual((order['id_pedido'], order['total'], order['costo_envio']), (15, 40000, 20000))
            self.assertEqual(conn.execute('SELECT Nombre_Producto FROM Detalle_Pedido').fetchone()[0], 'Taladro al comprar')
            self.assertEqual(conn.execute('SELECT SUM(Total) FROM Venta').fetchone()[0], 40000)
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM Pago').fetchone()[0], 1)
            self.assertEqual(conn.execute('SELECT Token_Hash FROM Sesion').fetchone()[0], 'token-hash')
            self.assertEqual(conn.execute('SELECT Valor FROM Configuracion').fetchone()[0], '22000')
            self.assertEqual(conn.execute('SELECT Accion FROM Bitacora').fetchone()[0], 'Accion anterior')
            self.assertEqual(conn.execute('SELECT Cantidad,Precio_Unitario FROM Detalle_Carrito').fetchone()[:], (1,10000))
            self.assertEqual(conn.execute('SELECT Id_Producto FROM Favorito').fetchone()[0], 11)
            self.assertIsNone(conn.execute("SELECT 1 FROM sqlite_master WHERE name='usuarios'").fetchone())
            conn.close()
            backups = list((path.parent / 'backups').glob('*.db'))
            self.assertEqual(len(backups), 1)
            previous = sqlite3.connect(backups[0])
            self.assertEqual(previous.execute('SELECT COUNT(*) FROM usuarios').fetchone()[0], 2)
            previous.close()

    def test_failed_migration_keeps_original_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'invalid.db'
            self.fixture(path)
            conn = sqlite3.connect(path)
            conn.execute('UPDATE pedido_items SET id_producto=999')
            conn.commit()
            conn.close()
            original = path.read_bytes()
            with self.assertRaises(sqlite3.IntegrityError):
                database.initialize(path, ROOT, lambda value: 'unused')
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(len(list((path.parent / 'backups').glob('*.db'))), 1)
            self.assertEqual(list(path.parent.glob('*.migrating_*.db')), [])


if __name__ == '__main__':
    unittest.main()
