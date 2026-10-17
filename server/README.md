# Ferretería Website Backend

Este es el backend para el sitio web de la ferretería. Está implementado en Python utilizando `http.server` y SQLite como base de datos.

## Requisitos

- Python 3.6 o superior
- Módulos de Python estándar (no se requieren módulos externos)

## Estructura de la Base de Datos

La base de datos SQLite se crea automáticamente al iniciar el servidor y contiene las siguientes tablas:

1. **users** - Almacena la información de usuarios
   - id (clave primaria)
   - name
   - email (único)
   - password
   - is_admin (0/1)

2. **products** - Almacena la información de productos
   - id (clave primaria)
   - name
   - code (único)
   - category
   - subcategory
   - brand
   - price
   - old_price
   - rating
   - review_count
   - in_stock
   - is_new (0/1)
   - is_on_sale (0/1)
   - image
   - short_description
   - description

3. **orders** - Almacena pedidos
   - id (clave primaria)
   - user_id (clave foránea a users)
   - order_date
   - total_amount
   - status

4. **order_items** - Almacena los items de cada pedido
   - id (clave primaria)
   - order_id (clave foránea a orders)
   - product_id (clave foránea a products)
   - quantity
   - price

## Ejecutar el Servidor

Para iniciar el servidor, ejecuta:

```bash
python app.py
```

Por defecto, el servidor se inicia en el puerto 8000. Para especificar un puerto diferente:

```bash
python app.py 9000
```

## Endpoints API

### Productos

- **GET /api/products** - Obtener todos los productos
  - Parámetros Query:
    - category - Filtrar por categoría
    - brand - Filtrar por marca
    - max_price - Precio máximo
    - sort - Ordenar por (price-low, price-high, name-asc, name-desc)

- **GET /api/products/{id}** - Obtener un producto específico

- **GET /api/categories** - Obtener todas las categorías

### Autenticación

- **POST /api/login** - Iniciar sesión
  - Body: `{ "email": "user@example.com", "password": "password" }`

- **POST /api/register** - Registrar nuevo usuario
  - Body: `{ "name": "User Name", "email": "user@example.com", "password": "password" }`

### Pedidos

- **POST /api/orders** - Crear un nuevo pedido
  - Body: 
  ```json
  { 
    "user_id": 1, 
    "items": [
      { "product_id": 1, "quantity": 2, "price": 19.99 }
    ], 
    "total_amount": 39.98 
  }
  ```

## Conexión desde el Frontend

El servidor incluye encabezados CORS para permitir peticiones desde cualquier origen. Puedes conectarte al backend desde tu frontend utilizando fetch:

```javascript
// Ejemplo para obtener productos
fetch('http://localhost:8000/api/products')
  .then(response => response.json())
  .then(data => console.log(data.products))
  .catch(error => console.error('Error:', error));

// Ejemplo para iniciar sesión
fetch('http://localhost:8000/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  }),
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```