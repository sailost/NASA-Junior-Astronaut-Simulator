@echo off
title SOL-3 Base Aurora - Servidor local
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Faltan dependencias. Ejecuta npm install en esta carpeta.
  pause
  exit /b 1
)
echo.
echo SOL-3 BASE AURORA
echo Abre http://127.0.0.1:5173/ en tu navegador.
echo Deja esta ventana abierta mientras juegas.
echo.
node "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort
echo.
echo Si el puerto ya esta ocupado, el juego puede estar funcionando en el enlace anterior.
pause
