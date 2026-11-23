# Correcciones realizadas

## Seguridad
- Se eliminó del código el correo y la clave del administrador (estaban publicados en el repositorio). Ahora salen de `server/.env`.
- Contraseñas: de SHA-256 sin sal a PBKDF2-SHA256 con sal. Las cuentas viejas se actualizan solas al iniciar sesión.
- Antes el servidor usaba `SimpleHTTPRequestHandler`, por lo que `GET /ferreteria.db` y `/app.py` se podían descargar. Ahora solo responde bajo `/api/`.
- Token falso (`"mock-token"`) reemplazado por sesiones reales con expiración, guardadas como hash en la base de datos.
- El panel admin ya no se protege con `localStorage` (editable desde la consola): el servidor valida el rol.
- El rol `vendedor` se asignaba a cualquiera que se registrara; ahora los registros son `cliente`.
- Pedidos: el servidor recalcula los precios y valida el stock.
- Límite de intentos de login, validación de correo y clave mínima de 8 caracteres.
- CORS con lista de orígenes (antes solo `127.0.0.1:5500`, lo que bloqueaba Vite en `localhost:5173`).
- Datos del catálogo escapados antes de insertarlos con `innerHTML` (evita inyección de HTML/JS).
- `ferreteria.db` retirada del repositorio; `.env`, `*.db` y `__pycache__` agregados a `.gitignore`.

## Errores de funcionamiento
- Icono de usuario/cerrar sesión no se actualizaba en varias páginas (auth.js corría antes de que existiera el header).
- Dos funciones `toggleLoading` distintas se pisaban entre `auth.js` y `common.js`.
- Logo apuntaba a `ferremax-logo.png` (el archivo es `.jpg`) y pesaba 900 KB: se creó `ferremax-logo-header.jpg` (45 KB).
- `img/juego de llaves.jpg` no coincidía en mayúsculas con `JUEGO DE LLAVES.jpg` (falla en Linux/hosting).
- Un `id` de producto inexistente mostraba el producto 1 sin avisar; ahora redirige a productos.
- El tope de precio fijo de 1000 ocultaba productos más caros.
- El buscador del header no hacía nada; ahora filtra por nombre, marca y descripción.
- El enlace "Ver Ofertas" (`?promo=true`) no filtraba nada; ahora sí.
- Los productos agregados al carrito perdían su código.
- Las tarjetas de categoría del inicio eran `div` con `onclick`; ahora son enlaces.
- `home.js` fallaba en navegadores sin `IntersectionObserver`.
- El checkout era un `alert` de ejemplo; ahora crea el pedido en el servidor (requiere iniciar sesión).

## Estructura y limpieza
- Nuevo `home.html` (inicio); `index.html` redirige a él.
- Eliminados restos de la plantilla de Vite: `counter.js`, `main.js`, `style.css` de raíz, `javascript.svg`, `vite.svg`, `CONFI/`.
- `package.json` renombrado de `vite-starter` a `ferremax`; README completo.
- Nuevas capas `js/config.js` y `js/api.js`; contrato en `docs/API.md`; guía de migración en `docs/MIGRACION_PHP.md`.
- El catálogo ahora vive en la base de datos (cargado desde `server/seed/products.json`); `products.js` conserva una copia de respaldo.

## Segunda ronda
- Precios en pesos colombianos (COP): catálogo, carrito, envíos (estándar $20.000, express $40.000, gratis desde $200.000), filtro de precio y descuentos calculados.
- Panel de administración real: dashboard, productos (crear, editar, eliminar), pedidos (cambiar estado) y usuarios, todo desde la base de datos.
- Se quitaron del panel las cifras inventadas (ventas, porcentajes, gráficas de maqueta).
- `iniciar.bat` para encender API y sitio con doble clic.
- `python server/app.py --sync-catalog` aplica los precios/datos del catálogo inicial a una base ya existente sin borrar nada.

## Tercera ronda (15 de noviembre de 2026)
- Administrador unico actualizado en la base local y sesiones anteriores revocadas.
- Direccion, telefono, envio y detalle de productos guardados en pedidos.
- Ventas cuenta pedidos pagados, enviados y entregados.
- Categorias, Promociones y Configuracion implementadas; tarifas persistentes.
- Historial administrativo persistente para productos, categorias, tarifas y estados de pedidos.
- Categorias sin productos retiradas de la navegacion; carrito y favoritos sincronizados por cuenta.
- API relativa al servidor; Vite con proxy para desarrollo.
- Pago manual identificado en checkout. Cobros en linea pendientes de proveedor y credenciales.
- Sesion antigua del navegador fuera del alcance por indicacion del usuario.
