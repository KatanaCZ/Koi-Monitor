@echo off
chcp 65001 >nul 2>&1
title Koi Monitor - Dev Server

:: ============================================
:: Koi Monitor - Lancement serveur dev
:: ============================================

cd /d "%~dp0"

echo.
echo ================================================================================
echo.
echo              Koi Monitor - DEV SERVER
echo.
echo ================================================================================
echo.

:: Lancement Tauri dev
echo Lancement du serveur de developpement...
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.

npm run tauri dev