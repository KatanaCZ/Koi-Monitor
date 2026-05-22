@echo off
chcp 65001 >nul 2>&1
title Koi Monitor - Installation

:: ============================================
:: VÉRIFICATION DROITS ADMINISTRATEUR
:: ============================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Droits administrateur requis!
    echo.
    echo Faites: Clic droit ^> Executer en tant qu'administrateur
    echo.
    pause
    exit /b 1
)

cls
color 0B
echo.
echo ================================================================================
echo.
echo              Koi Monitor - INSTALLATION
echo.
echo ================================================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: ============================================
:: ÉTAPE 1: VÉRIFICATION NODE.JS
:: ============================================
echo [1/5] Vérification de Node.js...

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('node --version 2^>nul') do set "NODE_VER=%%i"
    echo   [OK] Node.js détecté: !NODE_VER!
    set "NODE_OK=1"
) else (
    echo   [INSTALLATION] Node.js non trouvé - installation...
    echo.

    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '$env:TEMP\nodejs-20.msi'" 2>nul

    if exist "%TEMP%\nodejs-20.msi" (
        msiexec /i "%TEMP%\nodejs-20.msi" /quiet /norestart
        timeout /t 45 /nobreak >nul
        del "%TEMP%\nodejs-20.msi" /f /q 2>nul
        echo   [OK] Node.js installé!
        set "NODE_OK=1"
    ) else (
        echo   [ERREUR] Échec du téléchargement de Node.js
        goto :error
    )
)

:: Rafraîchir PATH
set "PATH=%PATH%;%ProgramFiles%\nodejs"
echo.

:: ============================================
:: ÉTAPE 2: VÉRIFICATION RUST
:: ============================================
echo [2/5] Vérification de Rust...

where rustc >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('rustc --version 2^>nul') do set "RUST_VER=%%i"
    echo   [OK] Rust détecté: !RUST_VER!
    set "RUST_OK=1"
) else (
    echo   [INSTALLATION] Rust non trouvé - installation...
    echo.

    powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs' -OutFile '$env:TEMP\rustup-init.exe'" 2>nul

    if exist "%TEMP%\rustup-init.exe" (
        "%TEMP%\rustup-init.exe" -y --default-toolchain stable --profile minimal
        timeout /t 90 /nobreak >nul
        del "%TEMP%\rustup-init.exe" /f /q 2>nul

        :: Ajouter au PATH
        set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"

        echo   [OK] Rust installé!
        set "RUST_OK=1"
    ) else (
        echo   [ERREUR] Échec du téléchargement de Rust
        goto :error
    )
)

:: Rafraîchir PATH
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"
echo.

:: ============================================
:: ÉTAPE 3: VÉRIFICATION WEBVIEW2
:: ============================================
echo [3/5] Vérification de WebView2...

reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A1A36827}" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] WebView2 installé (Microsoft Edge)
) else (
    echo   [INFO] WebView2 sera utilisé via Microsoft Edge (inclus Windows 11)
)

echo.

:: ============================================
:: ÉTAPE 4: INSTALLATION DÉPENDANCES NPM
:: ============================================
echo [4/5] Installation des dépendances npm...

echo   Nettoyage des anciens fichiers...
if exist "node_modules" rmdir /s /q "node_modules" 2>nul
if exist "package-lock.json" del "package-lock.json" 2>nul
if exist "pnpm-lock.yaml" del "pnpm-lock.yaml" 2>nul

echo   Installation en cours...
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo.
    echo   [ERREUR] npm install a échoué
    echo   Tentative avec yarn...
    call yarn install
    if %errorlevel% neq 0 (
        goto :error
    )
)

echo   [OK] Dépendances npm installées!
echo.

:: ============================================
:: ÉTAPE 5: BUILD TAURI
:: ============================================
echo [5/5] Build de l'executable...
echo.
echo   Cette étape peut prendre 15-30 minutes (première compilation Rust)
echo   NE FERMEZ PAS CETTE FENETRE!
echo.

echo   Build frontend...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo   [ERREUR] Build frontend a échoué
    goto :error
)

echo.
echo   Build Tauri (compilation Rust)...
echo.

call npm run tauri build -- --no-bundle

if %errorlevel% neq 0 (
    echo.
    echo   [ERREUR] Build Tauri a échoué
    echo.
    echo   Essayez les commandes suivantes:
    echo     rustup update
    echo     npm run tauri build
    echo.
    pause
    exit /b 1
)

:: ============================================
:: SUCCÈS - RECHERCHE DU FICHIER EXE
:: ============================================
cls
color 0A
echo.
echo ================================================================================
echo.
echo                    INSTALLATION TERMINEE AVEC SUCCES!
echo.
echo ================================================================================
echo.

set "EXE_FOUND="
for /r "%PROJECT_DIR%src-tauri\target\release" %%f in (*.exe) do (
    echo "%%~nxf" | findstr /i "koi" >nul 2>&1
    if !errorlevel! equ 0 (
        set "EXE_FOUND=%%f"
    )
)

if not defined EXE_FOUND (
    for /r "%PROJECT_DIR%src-tauri\target\release" %%f in (*.exe) do (
        echo "%%~nxf" | findstr /v "WebView2Loader" >nul 2>&1
        if !errorlevel! equ 0 (
            set "EXE_FOUND=%%f"
        )
    )
)

if defined EXE_FOUND (
    echo   Executable trouve:
    echo   !EXE_FOUND!
    echo.
    echo   Copiez koi-monitor.exe ou double-cliquez pour lancer.
    echo.

    set /p "LAUNCH=Voulez-vous lancer maintenant? (O/N): "
    if /i "!LAUNCH!"=="O" start "" "!EXE_FOUND!"
) else (
    echo   [ATTENTION] Fichier executable non trouve automatiquement
    echo.
    echo   Verifiez manuellement dans:
    echo   %PROJECT_DIR%src-tauri\target\release\
    echo.
    echo   Cherchez un fichier .exe (pas WebView2Loader.dll)
)

echo.
pause
exit /b 0

:error
cls
color 0C
echo.
echo ================================================================================
echo.
echo                      ERREUR LORS DE L'INSTALLATION
echo.
echo ================================================================================
echo.
echo Conseils:
echo   - Verifiez votre connexion internet
echo   - Executez en tant qu'administrateur
echo   - Desactivez temporairement l'antivirus
echo   - Verifiez l'espace disque disponible
echo.
echo Si le probleme persiste, installez manuellement:
echo   Node.js: https://nodejs.org/
echo   Rust: https://rustup.rs/
echo.
pause
exit /b 1
