@echo off



chcp 65001 >nul 2>&1

title Koi Monitor



cd /d "%~dp0"



if "%~1"=="" goto :menu

if /i "%~1"=="build" goto :run_build

if /i "%~1"=="dev" goto :run_dev

if /i "%~1"=="devfast" goto :run_devfast

if /i "%~1"=="setup" goto :run_setup

if /i "%~1"=="doctor" goto :run_doctor



echo.

echo Usage: koi.bat [build^|dev^|devfast^|setup^|doctor]

echo.

pause

exit /b 1



:menu

cls

echo.

echo ================================================================================

echo                         Koi Monitor

echo ================================================================================

echo.

echo   [1] Build    — clean + koi-monitor.exe

echo   [2] Dev      — Tauri + Vite (recompile Rust si besoin)

echo   [3] DevFast  — Tauri + Vite, sans recompiler Rust

echo   [4] Setup    — premiere install (admin)

echo   [5] Doctor   — diagnostic + reparations

echo   [Q] Quitter

echo.

set "CHOICE="

set /p "CHOICE=Votre choix: "

if /i "%CHOICE%"=="1" goto :run_build

if /i "%CHOICE%"=="2" goto :run_dev

if /i "%CHOICE%"=="3" goto :run_devfast

if /i "%CHOICE%"=="4" goto :run_setup

if /i "%CHOICE%"=="5" goto :run_doctor

if /i "%CHOICE%"=="Q" exit /b 0

goto :menu



:run_build

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\koi.ps1" -Action Build

goto :done



:run_dev

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\koi.ps1" -Action Dev

goto :done_no_pause



:run_devfast

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\koi.ps1" -Action DevFast

goto :done_no_pause



:run_setup

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\koi.ps1" -Action Setup

goto :done



:run_doctor

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\koi.ps1" -Action Doctor

goto :done



:done

set "EXIT_CODE=%ERRORLEVEL%"

echo.

if not "%EXIT_CODE%"=="0" (

    echo [ERREUR] Echec (code %EXIT_CODE%)

) else (

    echo Termine.

)

echo.

pause

exit /b %EXIT_CODE%



:done_no_pause

exit /b %ERRORLEVEL%


