# FerreMax

La base activa ya integra el modelo ER y la web en un solo esquema de 30 tablas. Consulta [Migracion ER](docs/MIGRACION_ER.md) para estructura, respaldo y alcance. El archivo de instalacion es `database/schema.sql`; el ER original queda como referencia.

Sistema web de ferretería (proyecto formativo SENA - ADSO, equipo GAES).

- **Frontend:** HTML + CSS + JavaScript (sin framework). Página de inicio: `html/home.html`.
- **Backend:** API REST en Python (solo librería estándar) + SQLite. Contrato en [`docs/API.md`](docs/API.md).
- **Futuro:** migración del backend a PHP/MySQL sin tocar el frontend ([`docs/MIGRACION_PHP.md`](docs/MIGRACION_PHP.md)).

## Cómo ejecutarlo

**En Windows (lo más fácil):** doble clic en `iniciar.bat`. Inicia la API y el sitio juntos en http://localhost:8000. Abre esa direcci?n en tu navegador; deja la consola abierta. Solo se sirven archivos p?blicos.

O manualmente:

1. **API** (terminal 1):
   ```bash
   cp server/.env.example server/.env     # edita la clave del admin
   python server/app.py
   ```
   La primera vez crea la base de datos, el catálogo inicial y el usuario administrador.
   Si no defines `FERREMAX_ADMIN_PASSWORD`, imprime una clave temporal en la consola.

2. **Sitio web** (terminal 2), con cualquiera de estas opciones:
   ```bash
   npm install && npm run dev      # Vite  -> http://localhost:5173
   # o Live Server de VS Code      -> http://127.0.0.1:5500
   ```
   Si usas otro puerto, agrégalo a `FERREMAX_CORS_ORIGINS` en `server/.env`.

> Si la API está apagada, el sitio sigue mostrando el catálogo local de respaldo (`js/products.js`),
> pero login, registro y pedidos requieren la API.

## Estructura

```
html/                 home, products, product-detail, cart, login, admin (.html)
index.html            redirige a html/home.html
css/  js/  img/       estilos, scripts e imágenes
js/config.js          URL de la API (único lugar que cambia al migrar a PHP)
js/api.js             única capa que habla con el backend
server/app.py         API en Python
server/database.py    acceso normalizado y migracion al modelo ER
server/seed/          catálogo inicial (products.json)
database/schema.sql   esquema de la base de datos
docs/                 API, migración a PHP y lista de correcciones
```

## Seguridad (resumen)

- No hay credenciales en el código: el admin sale de `server/.env`.
- Contraseñas con PBKDF2-SHA256 + sal; sesiones con token aleatorio guardado como hash en la base de datos.
- Los permisos (admin) se validan en el servidor, no en el navegador.
- `server/.env` y `*.db` están en `.gitignore`.

## Administrador y precios

Abre http://localhost:8000/html/login.html. En el primer inicio se crea el administrador
con el correo `admin@ferremax.local` (o `FERREMAX_ADMIN_EMAIL`); su clave temporal aparece
una sola vez en la consola. Tambi?n puedes definir `FERREMAX_ADMIN_PASSWORD` antes del
primer inicio. El login de administrador abre el panel autom?ticamente y la navegaci?n
muestra el enlace Administraci?n. Para cambiar una clave existente usa
`python server/app.py --reset-password correo@ejemplo.com`.

Los importes del cat?logo ya est?n expresados en COP; no se aplica una tasa de cambio.
Se muestran sin decimales con separador de miles colombiano. El servidor calcula el env?o:
$20.000 est?ndar, $40.000 express y gratis desde $200.000, y lo incluye en el total guardado.
El panel permite renombrar categorias, editar promociones, configurar tarifas y consultar el historial de administracion. La recuperacion de claves se realiza desde la consola.


## Actualizacion local del 15 de noviembre de 2026

- El administrador unico de esta copia es `dyegitalero04@gmail.com`; su clave esta guardada como hash en SQLite. La clave temporal no se publica en archivos de configuracion.
- Ejecuta `iniciar.bat`, abre http://localhost:8000 y accede mediante `html/login.html`. Si el servidor ya estaba encendido, detenlo con Ctrl+C y vuelve a iniciarlo.
- Los pedidos requieren direccion y telefono; guardan metodo y costo de envio y el nombre del producto al comprar. El panel incluye el detalle de cada pedido.
- Ventas suma pedidos pagados, enviados y entregados. El administrador confirma el pago manualmente. No existe una pasarela de cobro conectada.
- Categorias permite renombrar las categorias de los productos. Para crear una categoria, asigna su nombre a un producto; las categorias sin productos no aparecen en la tienda.
- Promociones permite editar productos, precio anterior y precio actual. No se ofrecen cupones.
- Configuracion permite cambiar tarifas de envio y consultar las ultimas 100 acciones administrativas registradas desde esta actualizacion.
- Carrito y favoritos se sincronizan por cuenta al entrar y al modificarlos. Los invitados usan almacenamiento local. El carrito de invitado se incorpora al iniciar sesion. La sincronizacion no es en tiempo real entre dispositivos abiertos.
- La API usa `/api` del mismo servidor, tambien al cambiar su puerto. Para desarrollo con Vite, el proxy en `vite.config.js` apunta al backend en 8000; ajustalo si cambias el puerto del backend. Live Server requiere configurar un proxy; usa preferentemente `iniciar.bat`.
- Verificacion: `python -B -m unittest discover -s server -p test_app.py` y `node --test server/test_frontend.cjs`.
- Logo del encabezado: `img/ferremax-logo-header.jpg`. Version original: `img/ferremax-logo.jpg`.
