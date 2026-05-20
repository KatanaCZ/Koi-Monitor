@echo off
chcp 65001 >nul 2>&1
title Koi Monitor - Build

:: ============================================
:: Koi Monitor - Build executable
:: ============================================

cd /d "%~dp0"

echo.
echo ================================================================================
echo.
echo              Koi Monitor - BUILD
echo.
echo ================================================================================
echo.

:: Build frontend
echo [1/2] Build frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Build frontend a echoue
    pause
    exit /b 1
)

:: Build Tauri
echo.
echo [2/2] Build Tauri (compilation Rust)...
echo.
call npm run tauri build

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Build Tauri a echoue
    pause
    exit /b 1
)

:: Trouver l'exe
echo.
echo ================================================================================
echo.
echo                    BUILD TERMINE AVEC SUCCES!
echo.
echo ================================================================================
echo.

for /r "%~dp0src-tauri\target\release" %%f in (*.exe) do (
    echo "%%~nxf" | findstr /i "koi" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Executable trouve: %%f
    )
)

echo.
echo   Cherchez aussi dans: %~dp0src-tauri\target\release\
echo.
pause
