# Backend de FerreMax (Python + SQLite)

Sin dependencias externas. Requiere Python 3.8 o superior.

```bash
cp .env.example .env     # ajusta la clave del admin y los orígenes CORS
python app.py            # puerto 8000 (o: python app.py 9000)
```

Al iniciar, `setup_database()` ejecuta `../database/schema.sql`, crea el administrador
(si no existe ninguno) y carga `seed/products.json` si la tabla de productos está vacía.

Variables de entorno (`.env`): `FERREMAX_PORT`, `FERREMAX_ADMIN_EMAIL`, `FERREMAX_ADMIN_PASSWORD`,
`FERREMAX_CORS_ORIGINS`, `FERREMAX_SESSION_HOURS`, `FERREMAX_DB`.

Endpoints y formatos JSON: ver [`../docs/API.md`](../docs/API.md).

Cuentas antiguas con hash SHA-256 (de la versión anterior) siguen funcionando: se convierten
automáticamente a PBKDF2 la primera vez que la persona inicia sesión.

## Comandos útiles

```bash
python app.py                                   # iniciar la API
python app.py --reset-password correo@x.com     # cambiar la clave de cualquier usuario (pide la clave sin mostrarla)
python app.py --sync-catalog                    # aplicar precios/datos de seed/products.json a la base existente
```


## Modelo ER integrado

La API utiliza `database.py` y el esquema unificado de 30 tablas en `../database/schema.sql`. La base anterior se migra automaticamente con respaldo en `backups/`. Detalles y limites en [MIGRACION_ER.md](../docs/MIGRACION_ER.md). Las claves existentes se conservan. Los datos de Ferreteria se completan desde Configuracion del panel.
