# Guía para migrar el backend a PHP

Objetivo: reemplazar `server/app.py` por PHP **sin modificar el frontend**. Todo el frontend habla con la API
a través de `js/api.js`, y la URL base está en `js/config.js`.

## 1. Estructura sugerida

```
ferremax/
├── api/
│   ├── index.php          # router: lee método + ruta y llama al controlador
│   ├── config.php         # lee .env (DB, CORS, horas de sesión)
│   ├── db.php             # conexión PDO
│   ├── auth.php           # hashing, tokens, currentUser(), requireAdmin()
│   └── controllers/       # auth.php, products.php, orders.php
├── database/schema.sql    # versión MySQL (ver notas al final del archivo)
├── html/, css/, js/, img/ ...
└── .env                   # fuera de la carpeta pública si es posible
```

Redirige todo `/api/*` a `api/index.php` (en Apache, un `.htaccess` con `RewriteRule ^(.*)$ index.php [QSA,L]`
dentro de `api/`).

## 2. Qué hay que respetar

1. **Las mismas rutas y los mismos JSON** de [`API.md`](API.md): nombres en `camelCase` (`oldPrice`, `inStock`, `isAdmin`...).
2. **Cabeceras:** `Content-Type: application/json; charset=utf-8`, CORS con lista de orígenes permitidos
   (no `*`) y responder `204` a `OPTIONS`. Si el frontend y PHP quedan en el mismo dominio, CORS ya no hace falta.
3. **Consultas con PDO y parámetros preparados** (`$stmt->execute([...])`), nunca concatenar variables en el SQL.
4. **Permisos en el servidor:** el rol sale de la base de datos usando el token, no de lo que envíe el navegador.
5. **Precios de pedidos desde la base de datos**, nunca desde el cliente.

## 3. Contraseñas: cómo seguir usando las cuentas existentes

El backend Python guarda `pbkdf2_sha256$iteraciones$sal_hex$hash_hex`. PHP lo verifica así:

```php
function verifyPassword(string $password, string $stored): bool {
    if (str_starts_with($stored, 'pbkdf2_sha256$')) {
        [, $iter, $salt, $hash] = explode('$', $stored);
        $calc = hash_pbkdf2('sha256', $password, hex2bin($salt), (int)$iter, 0, false);
        return hash_equals($hash, $calc);
    }
    return password_verify($password, $stored);       // hashes nuevos de PHP
}
```

Migración progresiva recomendada: al iniciar sesión con un hash `pbkdf2_sha256$...`, volver a guardar la clave con
`password_hash($password, PASSWORD_ARGON2ID)` (o `PASSWORD_DEFAULT`). Para registrar usuarios nuevos usa siempre `password_hash`.

## 4. Tokens de sesión

El token que recibe el navegador es aleatorio (`bin2hex(random_bytes(32))`); en la tabla `sesiones` se guarda solo
su hash: `hash('sha256', $token)`. Es el mismo esquema que usa Python, así que las sesiones activas incluso
pueden convivir durante la transición.

## 5. Base de datos

- Opción simple: seguir con SQLite desde PHP (`new PDO('sqlite:' . $ruta)`); el esquema ya es el mismo.
- Opción recomendada para producción: MySQL/MariaDB. Aplica las notas del final de `database/schema.sql`
  (`AUTO_INCREMENT`, `TINYINT(1)`, `utf8mb4`) y exporta los datos desde SQLite.

## 6. Orden de trabajo sugerido

1. Crear `api/index.php` con el router y `GET /categories` + `GET /products` (lo que ya usa el home).
2. Cambiar `API_BASE_URL` en `js/config.js` y comprobar que el home y los productos cargan igual.
3. Implementar `/register`, `/login`, `/me`, `/logout`.
4. Implementar `/orders` y el CRUD de productos (admin).
5. Apagar `server/app.py`.

## 7. Cómo comprobar que la API en PHP cumple el contrato

Ejecuta las mismas peticiones contra ambas APIs y compara respuestas y códigos HTTP. Ejemplo:

```bash
curl -s http://localhost:8000/api/products | head -c 300      # Python
curl -s http://localhost/ferremax/api/products | head -c 300  # PHP
```
