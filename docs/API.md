# Contrato de la API de FerreMax

Esta es la **fuente de verdad**. La API en Python y la futura API en PHP deben responder exactamente así;
mientras se respete, el frontend no necesita cambios (solo `API_BASE_URL` en `js/config.js`).

- Base: `http://localhost:8000/api`
- Formato: JSON UTF-8. Errores: `{ "error": "mensaje" }` con el código HTTP correspondiente.
- Autenticación: cabecera `Authorization: Bearer <token>` (el token se obtiene en `/login`).

## Autenticación

| Método y ruta | Auth | Cuerpo | Respuesta |
|---|---|---|---|
| `POST /register` | no | `{name, email, password}` (clave ≥ 8 caracteres) | `201 {message}` · `400` datos inválidos · `409` correo repetido |
| `POST /login` | no | `{email, password}` | `200 {user, token, expiresAt}` · `401` credenciales inválidas · `429` demasiados intentos |
| `POST /logout` | sí | — | `200 {message}` (invalida el token) |
| `GET /me` | sí | — | `200 {user}` · `401` |

`user` = `{ id, name, email, role, isAdmin }` — `role`: `admin` \| `vendedor` \| `cliente`.
Los registros nuevos quedan como `cliente`.

## Productos

| Método y ruta | Auth | Notas |
|---|---|---|
| `GET /products` | no | Filtros opcionales: `category`, `brand`, `max_price`, `search`, `promo=true`, `sort` (`price-low`, `price-high`, `name-asc`, `name-desc`). → `{products: [...]}` |
| `GET /products/{id}` | no | → `{product}` · `404` |
| `GET /categories` | no | → `{categories: [...]}` |
| `POST /products` | admin | Crea. Obligatorios: `name`, `code`, `category`, `price`. → `201 {product}` · `409` código repetido |
| `PUT /products/{id}` | admin | Reemplaza los campos. → `200 {product}` |
| `DELETE /products/{id}` | admin | Borrado lógico (`Estado_Publicacion = 'inactivo'). → `200 {message}` |

`product` = `{ id, name, code, category, subcategory, brand, price, oldPrice, rating, reviewCount, inStock, isNew, isOnSale, image, images[], shortDescription, description }`

## Pedidos

| Método y ruta | Auth | Cuerpo | Respuesta |
|---|---|---|---|
| `POST /orders` | sí | `{items: [{product_id, quantity}], address, city, phone, shipping?: "standard" | "express" | "free"}` | `201 {order: {id, total, status}}` · `409` sin stock |
| `GET /orders` | sí | — | `{orders: [{id, date, total, status}]}` (solo los del usuario) |

El servidor **ignora cualquier precio enviado por el cliente**: calcula el total con los precios de la base
de datos y descuenta el stock dentro de una transacci?n. Agrupa productos repetidos.
El total incluye env?o: est?ndar $20.000 COP, express $40.000 COP, gratis desde $200.000 COP.

## Administración (todas exigen rol `admin`; si no, `403`)

| Método y ruta | Respuesta |
|---|---|
| `GET /admin/stats` | `{stats: {sales, orders, pendingOrders, customers, products, lowStock, recentOrders[]}}` |
| `GET /admin/orders` | `{orders: [{id, date, customer, email, units, total, status}]}` |
| `PUT /admin/orders/{id}` | Cuerpo `{status}` (`pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`). Cancelar devuelve el stock. |
| `GET /admin/customers` | `{customers: [{id, name, email, role, active, createdAt, lastAccess}]}` |

Los precios son números en pesos colombianos (COP), sin decimales.

## Códigos HTTP usados

`200` ok · `201` creado · `400` datos inválidos · `401` sin sesión · `403` sin permiso · `404` no existe ·
`409` conflicto (duplicado o sin stock) · `413` cuerpo muy grande · `429` demasiados intentos · `500` error interno.


## Contrato adicional del modelo ER integrado

La API conserva los nombres JSON usados por la web aunque internamente las tablas esten normalizadas.

| Metodo y ruta | Permiso | Cuerpo / respuesta |
|---|---|---|
| `GET /settings` | publico | `{settings: {standard, express, freeFrom}}` |
| `PUT /admin/settings` | admin | `{standard, express, freeFrom}`: enteros COP entre 0 y 10000000 |
| `GET /admin/store` | admin | `{store: {name, nit, phone, address, city, description}}` |
| `PUT /admin/store` | admin | Todos los campos de `store`; nombre obligatorio, NIT y contacto completados por la tienda |
| `GET /preferences` | sesion | `{preferences: null}` si nunca se guardo, o `{preferences: {cart: [...], wishlist: [id]}}` |
| `PUT /preferences` | sesion | `{cart: [{id, quantity}], wishlist: [id]}`; los precios del cliente se ignoran |
| `PUT /admin/categories` | admin | `{old, name}`; renombra o fusiona categorias por sus relaciones |
| `GET /admin/activity` | admin | `{activity: [{id, accion, fecha, email}]}`; ultimas 100 acciones |
| `GET /admin/orders/{id}` | admin | `{order, items, history}`; direccion, ciudad, telefono, metodo/costo de envio, productos e historial |

`POST /orders` requiere `address` (5 a 255 caracteres), `city` (2 a 100) y `phone` (7 a 25, numeros y separadores). Guarda carrito, direccion, pedido, envio, detalle, movimiento e historial en una transaccion. Tarifas iniciales: 20000 estandar, 40000 express, gratis desde 200000; se pueden cambiar en Configuracion.

Estados: pendiente -> pagado -> enviado -> entregado; se puede cancelar desde cualquier estado no cancelado. Repetir el mismo estado es idempotente. Otros saltos devuelven 409. Confirmar pago crea Venta y Pago una sola vez; cancelar devuelve stock y anula el registro interno, sin ejecutar reembolsos bancarios. Ventas del panel suma Venta confirmada.
