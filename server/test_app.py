"""Pruebas de integraci?n con base temporal; no usa datos del proyecto."""
import concurrent.futures
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import app


class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        app.DB_PATH = Path(cls.temp.name) / 'test.db'
        os.environ['FERREMAX_ADMIN_EMAIL'] = 'admin@ferremax.local'
        os.environ['FERREMAX_ADMIN_PASSWORD'] = 'SoloPruebas123!'
        with contextlib.redirect_stdout(io.StringIO()):
            app.setup_database()
        class QuietHandler(app.Handler):
            def log_message(self, *args):
                pass
        cls.server = app.ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def request(self, path, data=None, token=None, method=None):
        if path == '/api/orders' and data is not None:
            data = dict(data, address='Calle 10, Bogota', phone='3001234567', city='Bogota')
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = Request(self.base + path, data=json.dumps(data).encode() if data is not None else None,
                          headers=headers, method=method)
        try:
            with urlopen(request) as response:
                body = response.read()
                return response.status, json.loads(body) if response.headers.get_content_type() == 'application/json' else body
        except HTTPError as error:
            return error.code, error.read()

    def login(self, email, password):
        status, data = self.request('/api/login', {'email': email, 'password': password})
        self.assertEqual(status, 200)
        return data['token']

    def test_flow(self):
        for email in ('ana@ejemplo.com', 'ana@otro.com'):
            self.assertEqual(self.request('/api/register', {'name': 'Ana Perez', 'email': email, 'password': 'Prueba123!'})[0], 201)
        self.assertEqual(self.request('/api/register', {'name': 'Ana', 'email': 'ana@otro.com', 'password': 'Prueba123!'})[0], 409)
        client = self.login('ana@ejemplo.com', 'Prueba123!')
        admin = self.login('admin@ferremax.local', 'SoloPruebas123!')
        self.assertEqual(self.request('/api/admin/stats', token=client)[0], 403)
        self.assertEqual(self.request('/api/admin/stats', token=admin)[0], 200)
        self.assertEqual(self.request('/api/me', token=admin)[1]['user']['isAdmin'], True)
        status, product = self.request('/api/products', {'name': 'Prueba', 'code': 'TEST', 'category': 'test', 'price': 10000, 'inStock': 10}, admin)
        self.assertEqual(status, 201)
        pid = product['product']['id']
        preferences = {'cart': [{'id': pid, 'quantity': 5, 'price': 1}], 'wishlist': [pid]}
        self.assertEqual(self.request('/api/preferences', preferences, client, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/preferences', token=client)[1]['preferences']['cart'][0]['price'], 10000)
        status, data = self.request('/api/orders', {'items': [{'product_id': pid, 'quantity': 2}, {'product_id': pid, 'quantity': 3}], 'shipping': 'express'}, client)
        self.assertEqual(status, 201)
        self.assertEqual(data['order']['total'], 90000)
        order_id = data['order']['id']
        detail = self.request('/api/admin/orders/' + str(order_id), token=admin)[1]
        self.assertEqual(detail['order']['direccion'], 'Calle 10, Bogota')
        self.assertEqual(detail['order']['costo_envio'], 40000)
        self.assertEqual(detail['items'][0]['cantidad'], 5)
        self.assertEqual(detail['order']['ciudad'], 'Bogota')
        self.assertEqual(self.request('/api/preferences', token=client)[1]['preferences']['cart'], [])
        conn = app.get_db()
        self.assertEqual(conn.execute('SELECT Estado FROM Carrito WHERE Id_Carrito=(SELECT Id_Carrito FROM Pedido WHERE Id_Pedido=?)', (order_id,)).fetchone()[0], 'convertido')
        self.assertEqual(conn.execute('SELECT COUNT(*) FROM Movimiento_Inventario WHERE Id_Pedido=?', (order_id,)).fetchone()[0], 1)
        conn.close()
        self.assertEqual(self.request('/api/admin/orders/' + str(order_id), {'status': 'enviado'}, admin, 'PUT')[0], 409)
        self.assertEqual(self.request('/api/admin/stats', token=admin)[1]['stats']['sales'], 0)
        self.assertEqual(self.request('/api/admin/orders/' + str(order_id), {'status': 'pagado'}, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/admin/stats', token=admin)[1]['stats']['sales'], 90000)
        self.assertEqual(self.request('/api/admin/orders/' + str(order_id), {'status': 'pagado'}, admin, 'PUT')[0], 200)
        conn = app.get_db()
        self.assertEqual(conn.execute('SELECT COUNT(*) FROM Venta WHERE Id_Pedido=?', (order_id,)).fetchone()[0], 1)
        self.assertEqual(conn.execute('SELECT COUNT(*) FROM Pago WHERE Id_Venta=(SELECT Id_Venta FROM Venta WHERE Id_Pedido=?)', (order_id,)).fetchone()[0], 1)
        conn.close()
        for _ in range(2):
            self.assertEqual(self.request('/api/admin/orders/' + str(order_id), {'status': 'cancelado'}, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/products/' + str(pid))[1]['product']['inStock'], 10)
        self.assertEqual(self.request('/api/admin/stats', token=admin)[1]['stats']['sales'], 0)
        conn = app.get_db()
        self.assertEqual(conn.execute('SELECT COUNT(*) FROM Movimiento_Inventario WHERE Id_Pedido=?', (order_id,)).fetchone()[0], 2)
        self.assertEqual(conn.execute('SELECT COUNT(*) FROM Historial_Pedido WHERE Id_Pedido=?', (order_id,)).fetchone()[0], 3)
        self.assertEqual(conn.execute('SELECT Estado FROM Venta WHERE Id_Pedido=?', (order_id,)).fetchone()[0], 'cancelada')
        conn.close()
        for quantity in (0, -1, 1.5, True, '2'):
            self.assertEqual(self.request('/api/orders', {'items': [{'product_id': pid, 'quantity': quantity}]}, client)[0], 400)
        self.assertEqual(self.request('/api/orders', {'items': [{'product_id': pid, 'quantity': 1}], 'shipping': 'free'}, client)[0], 400)
        def buy(_):
            return self.request('/api/orders', {'items': [{'product_id': pid, 'quantity': 6}]}, client)[0]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(buy, range(2))), [201, 409])
        self.assertEqual(self.request('/api/products/' + str(pid))[1]['product']['inStock'], 4)
        update = {'name': 'Nombre cambiado', 'code': 'TEST', 'category': 'test', 'price': 12000, 'inStock': 4}
        self.assertEqual(self.request('/api/products/' + str(pid), update, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/admin/orders/' + str(order_id), token=admin)[1]['items'][0]['nombre'], 'Prueba')
        self.assertEqual(self.request('/api/products/' + str(pid), token=admin, method='DELETE')[0], 200)
        self.assertEqual(self.request('/api/products/' + str(pid))[0], 404)
        self.assertEqual(self.request('/api/admin/orders/' + str(order_id), token=admin)[0], 200)
        self.assertEqual(self.request('/api/logout', {}, client)[0], 200)
        self.assertEqual(self.request('/api/me', token=client)[0], 401)

    def test_settings_and_preferences(self):
        admin = self.login('admin@ferremax.local', 'SoloPruebas123!')
        self.assertEqual(self.request('/api/admin/settings', {'standard': -1, 'express': 40000, 'freeFrom': 200000}, admin, 'PUT')[0], 400)
        rates = {'standard': 20000, 'express': 40000, 'freeFrom': 200000}
        self.assertEqual(self.request('/api/admin/settings', rates, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/settings')[1]['settings'], rates)
        self.assertEqual(self.request('/api/preferences')[0], 401)
        state = {'cart': [], 'wishlist': [1]}
        self.assertEqual(self.request('/api/preferences', state, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/preferences', token=admin)[1]['preferences'], state)
        self.assertTrue(self.request('/api/admin/activity', token=admin)[1]['activity'])
        self.assertEqual(self.request('/api/register', {'name': 'Cliente configuracion', 'email': 'config@ejemplo.com', 'password': 'Prueba123!'})[0], 201)
        client = self.login('config@ejemplo.com', 'Prueba123!')
        self.assertIsNone(self.request('/api/preferences', token=client)[1]['preferences'])
        self.assertEqual(self.request('/api/admin/settings', rates, client, 'PUT')[0], 403)
        changed = dict(rates, standard=12345)
        self.assertEqual(self.request('/api/admin/settings', changed, admin, 'PUT')[0], 200)
        product = self.request('/api/products', {'name': 'Tarifa', 'code': 'RATE-TEST', 'category': 'test', 'price': 1000, 'inStock': 2}, admin)[1]['product']
        order = self.request('/api/orders', {'items': [{'product_id': product['id'], 'quantity': 1}]}, client)[1]['order']
        self.assertEqual(order['total'], 13345)
        bad = Request(self.base + '/api/orders', data=json.dumps({'items': [{'product_id': product['id'], 'quantity': 1}]}).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + client})
        with self.assertRaises(HTTPError) as error:
            urlopen(bad)
        self.assertEqual(error.exception.code, 400)
        self.request('/api/admin/settings', rates, admin, 'PUT')
        store = self.request('/api/admin/store', token=admin)[1]['store']
        store.update(city='Bogota', phone='3001234567')
        self.assertEqual(self.request('/api/admin/store', store, admin, 'PUT')[0], 200)
        self.assertEqual(self.request('/api/admin/store', token=admin)[1]['store']['city'], 'Bogota')
        self.assertEqual(self.request('/api/admin/store', token=client)[0], 403)
        self.assertEqual(self.request('/api/admin/store', {'name': ''}, admin, 'PUT')[0], 400)
        self.assertEqual(self.request('/api/admin/categories', {'old': 'herramientas', 'name': 'herramientas'}, admin, 'PUT')[0], 200)

    def test_private_files(self):
        for path in ('/server/app.py', '/server/.env', '/server/ferreteria.db', '/database/schema.sql', '/%2e%2e/server/app.py', '/server/', '/js/../server/app.py'):
            self.assertEqual(self.request(path)[0], 404, path)
        for path in ('/', '/html/login.html', '/html/admin.html', '/js/api.js', '/css/style.css'):
            self.assertEqual(self.request(path)[0], 200, path)


if __name__ == '__main__':
    unittest.main()
