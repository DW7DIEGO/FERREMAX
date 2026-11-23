@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (set "PY=py") || (set "PY=python")
%PY% --version >nul 2>nul
if errorlevel 1 (
    echo No se encontro Python. Instala Python y activa Add Python to PATH.
    pause
    exit /b 1
)
echo FerreMax: http://localhost:8000/html/home.html
echo Administracion: http://localhost:8000/html/admin.html
echo En el primer inicio, el correo y la clave del administrador aparecen debajo.
echo Mant?n esta ventana abierta mientras uses la pagina.
%PY% server\app.py
pause
