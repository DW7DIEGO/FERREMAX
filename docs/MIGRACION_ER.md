# Base de datos integrada con el modelo ER

La web utiliza una sola base SQLite: `server/ferreteria.db`.
El esquema definitivo, sin comentarios SQL, es `database/schema.sql`.
`database/ferremax_er_sqlite.sql` conserva el ER original como referencia; no es el archivo de instalación de la web.

## Qué se integró

Las 26 tablas originales del diagrama se conservan, con sus claves foráneas. El esquema incorpora estas extensiones para mantener las funciones de la web:

| Elemento | Adaptación |
|---|---|
| Usuario y Rol | Permisos mediante `Id_Rol`; nombre de usuario, fecha de registro y último acceso conservados. |
| Producto y Categoria | Relación por `Id_Categoria`; código, imágenes, promociones, descripción corta y calificación añadidos a Producto. |
| Inventario | El stock de la tienda se lee y actualiza en `Stock_Total`. |
| Carrito y Detalle_Carrito | Carrito por cliente, con cantidades y precios obtenidos del servidor. Al comprar, el carrito queda convertido y vinculado al pedido. |
| Direccion, Pedido y Envio | Dirección y ciudad separadas; teléfono de contacto conservado en el pedido; método y tarifa en el envío. |
| Detalle_Pedido | Guarda el nombre y precio al comprar, para conservar el historial aunque cambie el catálogo. |
| Venta y Pago | Confirmar un pedido como pagado registra una venta y un pago manual, una sola vez. |
| Movimiento_Inventario | Registra salidas por pedidos, entradas por cancelaciones y ajustes administrativos posteriores a la migración. |
| Historial_Pedido | Registra creación y cambios de estado con fecha y usuario. |
| Bitacora | Conserva el historial administrativo y recibe las nuevas acciones. |
| Ferreteria | Datos editables en Administración → Configuración. El NIT y los datos desconocidos quedan pendientes de completar. |

Las cuatro tablas de soporte son `Sesion`, `Configuracion`, `Favorito` y `Preferencia_Usuario`. Esta última indica si una cuenta ya inicializó sus preferencias; los productos del carrito se guardan en las tablas del ER, no en un JSON paralelo.

## Migración y respaldo

Al iniciar, `server/database.py` detecta el esquema anterior. Primero crea una copia consistente en `server/backups/antes_migracion_er_*.db`; después migra a un archivo temporal, verifica integridad, claves foráneas y conteos, y sustituye la base activa. Si falla una comprobación, conserva la base anterior.

Se conservan identificadores de usuarios, productos y pedidos, contraseñas cifradas mediante hash, sesiones, precios, imágenes, existencias, configuraciones y preferencias. El arranque posterior no repite la migración ni crea otro administrador. La versión del esquema es `PRAGMA user_version = 3`.

Los registros anteriores sin ciudad mantienen la ciudad vacía: no se inventan datos de entrega. Los pedidos nuevos requieren ciudad. No se reconstruyen movimientos históricos de inventario que el sistema anterior no registraba.

## Arranque

Desde la carpeta `PAGINA WEB`, abre `iniciar.bat` o ejecuta:

```powershell
python server/app.py
```

Abre `http://localhost:8000` y usa `http://localhost:8000/html/login.html` para entrar al panel. Si había un servidor encendido antes de actualizar el código, detenlo con Ctrl+C y vuelve a iniciarlo.

## Alcance

La integración cubre las funciones actuales de catálogo, registro, autenticación, carrito, favoritos, pedidos, inventario y administración. Las tablas de reservas, abonos, domiciliarios, entregas, notificaciones, verificaciones y facturas quedan disponibles con sus relaciones; sus pantallas y procesos especializados aún no están construidos.

Los pagos son confirmaciones manuales del administrador, no cobros bancarios. Cancelar anula el registro interno y devuelve stock; no ejecuta devoluciones de dinero. No se emiten facturas fiscales automáticamente. Los indicadores `Frecuente`, `Buen_Pago`, `Stock_Reservable` y `Saldo_Pendiente` no reciben reglas de negocio inventadas.

## Verificación

```powershell
python -B -m unittest discover -s server -p "test*.py"
node --test server/test_frontend.cjs
```

Las pruebas usan bases temporales. Comprueban el esquema, migración, conservación de datos, respaldo ante fallos, registro, permisos, compras simultáneas, stock, historial, pagos idempotentes, configuración y preferencias por cuenta.
