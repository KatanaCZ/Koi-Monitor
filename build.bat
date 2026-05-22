@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title Koi Monitor - Build

:: ============================================
:: Koi Monitor - Build executable (.exe only)
:: ============================================

cd /d "%~dp0"

set "EXE_PATH=%~dp0src-tauri\target\release\koi-monitor.exe"
set "BUNDLE_DIR=%~dp0src-tauri\target\release\bundle"

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

:: Build Tauri (no NSIS/MSI installers)
echo.
echo [2/2] Build Tauri (koi-monitor.exe uniquement)...
echo.
call npm run tauri build -- --no-bundle

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Build Tauri a echoue
    pause
    exit /b 1
)

:: Remove legacy installer artifacts if present
if exist "%BUNDLE_DIR%" (
    echo.
    echo Nettoyage: suppression de %BUNDLE_DIR%
    rmdir /s /q "%BUNDLE_DIR%" 2>nul
)

echo.
echo ================================================================================
echo.
echo                    BUILD TERMINE AVEC SUCCES!
echo.
echo ================================================================================
echo.

if exist "%EXE_PATH%" (
    echo   Executable: %EXE_PATH%
) else (
    echo   [ATTENTION] koi-monitor.exe introuvable — verifiez src-tauri\target\release\
)

echo.
pause
