PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE Rol (
    Id_Rol INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre_Rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Usuario (
    Id_Usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Rol INTEGER NOT NULL REFERENCES Rol(Id_Rol),
    Nombre VARCHAR(100) NOT NULL,
    Correo VARCHAR(100) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    N_Telefono VARCHAR(30),
    Foto VARCHAR(255),
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Cliente (
    Id_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Frecuente BOOLEAN NOT NULL DEFAULT 0 CHECK (Frecuente IN (0, 1)),
    Buen_Pago BOOLEAN NOT NULL DEFAULT 0 CHECK (Buen_Pago IN (0, 1))
);

CREATE TABLE Direccion (
    Id_Direccion INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Cliente INTEGER NOT NULL REFERENCES Cliente(Id_Cliente),
    Direccion VARCHAR(255) NOT NULL,
    Ciudad VARCHAR(100) NOT NULL,
    Barrio VARCHAR(100),
    Referencia TEXT,
    Principal BOOLEAN NOT NULL DEFAULT 0 CHECK (Principal IN (0, 1))
);

CREATE TABLE Ferreteria (
    Id_Ferreteria INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Nombre VARCHAR(150) NOT NULL,
    NIT VARCHAR(30) NOT NULL,
    Telefono VARCHAR(30),
    Direccion VARCHAR(255),
    Ciudad VARCHAR(100),
    Descripcion TEXT,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Categoria (
    Id_Categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Producto (
    Id_Producto INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Ferreteria INTEGER NOT NULL REFERENCES Ferreteria(Id_Ferreteria),
    Id_Categoria INTEGER NOT NULL REFERENCES Categoria(Id_Categoria),
    Nombre VARCHAR(150) NOT NULL,
    Descripcion TEXT,
    Marca VARCHAR(60),
    Precio DECIMAL(12, 2) NOT NULL CHECK (Precio >= 0),
    Estado_Publicacion VARCHAR(30) NOT NULL,
    Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Inventario (
    Id_Inventario INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Producto INTEGER NOT NULL UNIQUE REFERENCES Producto(Id_Producto),
    Stock_Total INTEGER NOT NULL DEFAULT 0 CHECK (Stock_Total >= 0),
    Stock_Reservable INTEGER CHECK (Stock_Reservable BETWEEN 0 AND Stock_Total),
    Stock_Minimo INTEGER NOT NULL DEFAULT 0 CHECK (Stock_Minimo >= 0),
    Fecha_Actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Carrito (
    Id_Carrito INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Cliente INTEGER NOT NULL REFERENCES Cliente(Id_Cliente),
    Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Detalle_Carrito (
    Id_Detalle_Carrito INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Carrito INTEGER NOT NULL REFERENCES Carrito(Id_Carrito),
    Id_Producto INTEGER NOT NULL REFERENCES Producto(Id_Producto),
    Cantidad INTEGER NOT NULL CHECK (Cantidad > 0),
    Precio_Unitario DECIMAL(12, 2) NOT NULL CHECK (Precio_Unitario >= 0)
);

CREATE TABLE Pedido (
    Id_Pedido INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Cliente INTEGER NOT NULL REFERENCES Cliente(Id_Cliente),
    Id_Carrito INTEGER UNIQUE REFERENCES Carrito(Id_Carrito),
    Id_Direccion INTEGER REFERENCES Direccion(Id_Direccion),
    Fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    Total DECIMAL(12, 2) CHECK (Total >= 0)
);

CREATE TABLE Detalle_Pedido (
    Id_Detalle_Pedido INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Pedido INTEGER NOT NULL REFERENCES Pedido(Id_Pedido),
    Id_Producto INTEGER NOT NULL REFERENCES Producto(Id_Producto),
    Cantidad INTEGER NOT NULL CHECK (Cantidad > 0),
    Precio_Unitario DECIMAL(12, 2) NOT NULL CHECK (Precio_Unitario >= 0)
);

CREATE TABLE Reserva (
    Id_Reserva INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Cliente INTEGER NOT NULL REFERENCES Cliente(Id_Cliente),
    Id_Usuario INTEGER REFERENCES Usuario(Id_Usuario),
    Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Fecha_Limite DATETIME NOT NULL,
    Estado VARCHAR(30) NOT NULL,
    Observaciones TEXT
);

CREATE TABLE Reserva_Producto (
    Id_Reserva INTEGER NOT NULL REFERENCES Reserva(Id_Reserva),
    Id_Producto INTEGER NOT NULL REFERENCES Producto(Id_Producto),
    Cantidad INTEGER NOT NULL CHECK (Cantidad > 0),
    Precio_Unitario DECIMAL(12, 2) NOT NULL CHECK (Precio_Unitario >= 0),
    PRIMARY KEY (Id_Reserva, Id_Producto)
);

CREATE TABLE Pago_Anticipado (
    Id_Pago_Anticipado INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Reserva INTEGER NOT NULL REFERENCES Reserva(Id_Reserva),
    Valor_Abono DECIMAL(12, 2) NOT NULL CHECK (Valor_Abono > 0),
    Fecha_Pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Saldo_Pendiente DECIMAL(12, 2) CHECK (Saldo_Pendiente >= 0),
    Numero_Comprobante VARCHAR(60)
);

CREATE TABLE Domiciliario (
    Id_Domiciliario INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Vehiculo VARCHAR(80),
    Licencia VARCHAR(50),
    Zona_Cobertura VARCHAR(150),
    Disponibilidad BOOLEAN NOT NULL DEFAULT 1 CHECK (Disponibilidad IN (0, 1))
);

CREATE TABLE Envio (
    Id_Envio INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Pedido INTEGER NOT NULL REFERENCES Pedido(Id_Pedido),
    Id_Domiciliario INTEGER REFERENCES Domiciliario(Id_Domiciliario),
    Tarifa DECIMAL(12, 2) NOT NULL CHECK (Tarifa >= 0),
    Impuesto DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (Impuesto >= 0),
    Fecha_Generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Entrega (
    Id_Entrega INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Reserva INTEGER NOT NULL REFERENCES Reserva(Id_Reserva),
    Id_Domiciliario INTEGER NOT NULL REFERENCES Domiciliario(Id_Domiciliario),
    Fecha DATE NOT NULL,
    Hora TIME NOT NULL,
    Id_Receptor TEXT,
    Numero_Comprobante VARCHAR(60)
);

CREATE TABLE Venta (
    Id_Venta INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Pedido INTEGER UNIQUE REFERENCES Pedido(Id_Pedido),
    Id_Reserva INTEGER REFERENCES Reserva(Id_Reserva),
    Id_Usuario INTEGER REFERENCES Usuario(Id_Usuario),
    Fecha_Venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Descuento DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (Descuento >= 0),
    Impuesto DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (Impuesto >= 0),
    Total DECIMAL(12, 2) NOT NULL CHECK (Total >= 0),
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Factura (
    Id_Factura INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Venta INTEGER NOT NULL UNIQUE REFERENCES Venta(Id_Venta),
    Numero_Factura VARCHAR(60) NOT NULL,
    Fecha_Emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Pago (
    Id_Pago INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Venta INTEGER NOT NULL REFERENCES Venta(Id_Venta),
    Metodo_Pago VARCHAR(50) NOT NULL,
    Monto DECIMAL(12, 2) NOT NULL CHECK (Monto > 0),
    Estado VARCHAR(30) NOT NULL,
    Referencia VARCHAR(100),
    Fecha_Pago DATETIME
);

CREATE TABLE Movimiento_Inventario (
    Id_Movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Producto INTEGER NOT NULL REFERENCES Producto(Id_Producto),
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Id_Reserva INTEGER REFERENCES Reserva(Id_Reserva),
    Id_Pedido INTEGER REFERENCES Pedido(Id_Pedido),
    Id_Venta INTEGER REFERENCES Venta(Id_Venta),
    Tipo_Movimiento VARCHAR(30) NOT NULL,
    Cantidad INTEGER NOT NULL CHECK (Cantidad > 0),
    Fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Motivo TEXT
);

CREATE TABLE Notificacion (
    Id_Notificacion INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Reserva INTEGER REFERENCES Reserva(Id_Reserva),
    Id_Pedido INTEGER REFERENCES Pedido(Id_Pedido),
    Tipo VARCHAR(30) NOT NULL,
    Mensaje TEXT NOT NULL,
    Fecha_Envio DATETIME,
    Estado VARCHAR(30) NOT NULL
);

CREATE TABLE Verificacion_Producto (
    Id_Verificacion INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Id_Producto INTEGER NOT NULL REFERENCES Producto(Id_Producto),
    Resultado VARCHAR(30) NOT NULL,
    Fecha_Verificacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Observacion TEXT
);

CREATE TABLE Bitacora (
    Id_Bitacora INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Usuario INTEGER NOT NULL REFERENCES Usuario(Id_Usuario),
    Accion VARCHAR(100) NOT NULL,
    Entidad_Afectada VARCHAR(100),
    Id_Registro_Afectado INTEGER,
    Fecha_Hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Descripcion TEXT
);

CREATE TABLE Historial_Pedido (
    Id_Historial INTEGER PRIMARY KEY AUTOINCREMENT,
    Id_Pedido INTEGER NOT NULL REFERENCES Pedido(Id_Pedido),
    Id_Usuario INTEGER REFERENCES Usuario(Id_Usuario),
    Estado_Anterior VARCHAR(30),
    Estado_Nuevo VARCHAR(30) NOT NULL,
    Fecha_Cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Motivo TEXT
);

COMMIT;
