param(
    [ValidateSet('Build', 'Dev', 'DevFast', 'Setup', 'Doctor')]
    [string]$Action = 'Build',
    [switch]$SkipClean,
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'koi-lib.ps1')
Set-KoiRoot (Split-Path -Parent $PSScriptRoot)

$Root = Get-KoiRoot
$ExePath = Get-KoiExePath

function Write-KoiHeader([string]$Title) {
    Write-Host ''
    Write-Host $Title
    Write-Host ''
}

function Invoke-KoiBuild {
    param([switch]$SkipCleanStep)

    $totalSteps = if ($SkipCleanStep) { 2 } else { 3 }
    $step = 1

    if (-not $SkipCleanStep) {
        Write-Host "[$step/$totalSteps] Nettoyage..."
        Invoke-KoiClean
        Write-Host ''
        $step++
    }

    Write-Host "[$step/$totalSteps] Prerequis..."
    Initialize-KoiEnv -RequireNodeModules -RequireCargo
    Write-Host ''
    $step++

    Write-Host "[$step/$totalSteps] Compilation..."
    $iconSource = Join-Path (Get-KoiRoot) 'src-tauri\icons\icon-source.png'
    if (Test-Path $iconSource) {
        Write-Host '  Sync icones Tauri (icon-source.png -> icon.ico)...'
        Invoke-Npm -NpmArgs @('run', 'icons')
    }
    Write-Host '  Tauri release (frontend embarque, sans installateur)...'
    Invoke-KoiTauriBuild

    Write-Host ''
    $published = Publish-KoiExe
    if ($published -and (Test-Path $published.Launch)) {
        Write-Host "OK: $($published.Launch)"
        Write-Host '     ^ Lancer ici (hors Bureau — evite blocage Windows Defender)'
        if (Test-Path $published.Mirror) {
            Write-Host "     Copie dev: $($published.Mirror)"
        }
        if ($env:CARGO_TARGET_DIR) {
            Write-Host "     Cache compile: $env:CARGO_TARGET_DIR"
        }
    } elseif (Test-Path $ExePath) {
        Write-Host "OK: $ExePath"
    } else {
        Write-KoiError 'koi-monitor.exe introuvable'
        exit 1
    }
}

function Invoke-KoiDev {
    Write-Host '[1/2] Prerequis...'
    Initialize-KoiEnv -RequireNodeModules -RequireCargo
    Write-Host ''
    Write-Host '[2/2] Demarrage Tauri + Vite (port 1420)...'
    & (Join-Path $PSScriptRoot 'kill-dev-port.ps1') -Port 1420
    Write-Host ''
    Invoke-Npm -NpmArgs @('run', 'tauri', 'dev')
    exit $LASTEXITCODE
}

function Invoke-KoiDevFast {
    Write-Host 'Demarrage Tauri rapide (port 1420) — sans recompilation Rust'
    Write-Host '  Vite + binaire debug — lancez koi.bat dev une fois si absent ou apres changement Rust'
    Write-Host ''

    Initialize-KoiEnv -RequireNodeModules -FrontendOnly -Quiet

    $debugExe = Get-KoiDebugExePath
    if (-not $debugExe) {
        Write-KoiError 'Binaire debug introuvable' 'koi.bat dev'
        exit 1
    }

    & (Join-Path $PSScriptRoot 'kill-dev-port.ps1') -Port 1420

    $root = Get-KoiRoot
    $viteProc = $null
    try {
        Write-Host '  Demarrage Vite...'
        $viteProc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm run dev') -WorkingDirectory $root -PassThru

        Write-Host '  Attente http://localhost:1420 ...'
        if (-not (Wait-KoiDevServer -Port 1420)) {
            Write-KoiError 'Vite n a pas demarre a temps' 'koi.bat doctor'
            exit 1
        }

        Write-Host "  Lancement $debugExe"
        Write-Host ''
        $appProc = Start-Process -FilePath $debugExe -WorkingDirectory $root -PassThru -Wait
        exit $(if ($null -ne $appProc.ExitCode) { $appProc.ExitCode } else { 0 })
    }
    finally {
        if ($viteProc -and -not $viteProc.HasExited) {
            Write-Host ''
            Write-Host '  Arret Vite...'
            Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue
        }
        & (Join-Path $PSScriptRoot 'kill-dev-port.ps1') -Port 1420 -Quiet
    }
}

function Invoke-KoiSetup {
    if (-not (Test-KoiAdmin)) {
        Write-KoiError 'Setup requiert les droits administrateur' 'Clic droit > koi.bat setup > Executer en tant qu administrateur'
        exit 1
    }

    Repair-KoiEnvVars | Out-Null
    Refresh-KoiPath

    Write-Host '[1/4] Node.js...'
    if (-not (Install-KoiNode)) { exit 1 }
    Write-Host ''

    Write-Host '[2/4] Rust (MSVC)...'
    if (-not (Install-KoiRust)) { exit 1 }
    Write-Host ''

    Write-Host '[3/4] Dependances npm...'
    if (Test-Path (Join-Path $Root 'package-lock.json')) {
        Write-Host '  npm ci...'
        Invoke-Npm -NpmArgs @('ci')
    } else {
        Write-Host '  npm install...'
        Invoke-Npm -NpmArgs @('install')
    }
    Write-Host '  Dependances installees'
    Write-Host ''

    if (-not $NonInteractive) {
        $defender = Read-Host 'Appliquer le correctif Defender maintenant ? (O/N)'
        if ($defender -match '^[OoYy]') {
            Invoke-KoiDefenderFix | Out-Null
            Refresh-KoiPath
        }
    }
    Write-Host ''

    Write-Host '[4/4] Build initial...'
    Invoke-KoiBuild -SkipCleanStep
}

function Invoke-KoiDoctor {
    Write-Host 'Diagnostic Koi Monitor'
    Write-Host '======================'
    Write-Host ''

    Write-Host '[Avant reparation]'
    $before = Get-KoiEnvReport
    Write-KoiEnvReport -Report $before
    Write-Host ''

    Write-Host 'Reparation automatique...'
    $repaired = Repair-KoiEnvVars
    if ($repaired.Count -gt 0) {
        Write-Host "  Vars reparees: $($repaired -join ', ')"
    }
    Refresh-KoiPath
    Import-VsDevShell | Out-Null
    Repair-KoiRustToolchain | Out-Null

    if (-not $before.MsvcToolchain) {
        Install-KoiMsvcToolchain | Out-Null
    }

    Write-Host ''
    Write-Host '[Apres reparation]'
    $after = Get-KoiEnvReport
    Write-KoiEnvReport -Report $after
    Write-Host ''

    $needsDefender = (-not $after.EsbuildOk) -or (-not $after.Cargo)
    if ($needsDefender -and -not $NonInteractive) {
        Write-Host 'Des problemes persistent (Defender / acces fichiers possibles).'
        Invoke-KoiDefenderFix | Out-Null
        Refresh-KoiPath
        Write-Host ''
        Write-Host '[Apres correctif Defender]'
        Write-KoiEnvReport -Report (Get-KoiEnvReport)
        Write-Host ''
    }

    if (-not $after.LinkExe) {
        Write-Host '[ATTENTION] link.exe absent — installez Visual Studio Build Tools (C++)'
        Write-Host '            https://visualstudio.microsoft.com/visual-cpp-build-tools/'
        Write-Host ''
    }

    if ($after.Node -and $after.MsvcToolchain -and $after.Cargo -and $after.EsbuildOk) {
        Write-Host 'Environnement pret. Lancez: koi.bat build'
        exit 0
    }

    Write-Host 'Problemes restants — consultez le rapport ci-dessus.'
    if (-not $after.Node) { Write-Host '  - Installez Node.js ou lancez: koi.bat setup' }
    if (-not $after.NodeModules) { Write-Host '  - Lancez: npm install ou koi.bat setup' }
    if (-not $after.MsvcToolchain) { Write-Host '  - Toolchain MSVC manquante' }
    exit 1
}

switch ($Action) {
    'Build' {
        if ($SkipClean) {
            Write-KoiHeader 'Koi Monitor - BUILD'
        } else {
            Write-KoiHeader 'Koi Monitor - BUILD (clean + exe)'
        }
        Invoke-KoiBuild -SkipCleanStep:$SkipClean
        exit 0
    }
    'Dev' {
        Write-KoiHeader 'Koi Monitor - DEV'
        Invoke-KoiDev
    }
    'DevFast' {
        Write-KoiHeader 'Koi Monitor - DEV RAPIDE'
        Invoke-KoiDevFast
    }
    'Setup' {
        Write-KoiHeader 'Koi Monitor - SETUP (admin)'
        Invoke-KoiSetup
        exit 0
    }
    'Doctor' {
        Write-KoiHeader 'Koi Monitor - DOCTOR'
        Invoke-KoiDoctor
    }
}
