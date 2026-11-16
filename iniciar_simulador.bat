@echo off
title NASA Lost Signals - Simulador Espacial 3D
echo ======================================================================
echo    NASA DEEP SPACE NETWORK // SIMULADOR DE SATELITES PERDIDOS
echo ======================================================================
echo.
echo Iniciando servidor Python Flask...

set PYTHON_CMD=python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    ) else (
        echo [ERROR] No se encontro Python instalado en el sistema.
        pause
        exit /b 1
    )
)

echo Abriendo navegador en http://127.0.0.1:5000...
start "" http://127.0.0.1:5000

%PYTHON_CMD% app.py
pause
