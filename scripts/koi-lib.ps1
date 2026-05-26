# Shared build/dev helpers — dot-sourced by koi.ps1
# DevFast: Get-KoiDebugExePath · Wait-KoiDevServer · Initialize-KoiEnv -FrontendOnly
$script:KoiMsvcToolchain = 'stable-x86_64-pc-windows-msvc'
$script:KoiRustupExe = $null
$script:KoiRoot = $null

function Set-KoiRoot([string]$Root) {
    $script:KoiRoot = $Root
}

function Get-KoiRoot {
    if (-not $script:KoiRoot) {
        $script:KoiRoot = Split-Path -Parent $PSScriptRoot
    }
    return $script:KoiRoot
}

function Get-KoiCargoTargetDir {
    if ($env:CARGO_TARGET_DIR) { return $env:CARGO_TARGET_DIR }
    return Join-Path (Get-KoiRoot) 'src-tauri\target'
}

function Initialize-KoiCargoTargetDir {
    if ($env:CARGO_TARGET_DIR) {
        New-Item -ItemType Directory -Force -Path $env:CARGO_TARGET_DIR | Out-Null
        return $env:CARGO_TARGET_DIR
    }
    $localTarget = Join-Path $env:LOCALAPPDATA 'koi-monitor\target'
    New-Item -ItemType Directory -Force -Path $localTarget | Out-Null
    $env:CARGO_TARGET_DIR = $localTarget
    return $localTarget
}

function Get-KoiExePath {
    $targetDir = Get-KoiCargoTargetDir
    $candidates = @(
        Join-Path $targetDir 'x86_64-pc-windows-msvc\release\koi-monitor.exe'
        Join-Path $targetDir 'release\koi-monitor.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    return $candidates[0]
}

function Get-KoiDebugExePath {
    Initialize-KoiCargoTargetDir | Out-Null
    $targetDir = Get-KoiCargoTargetDir
    $root = Get-KoiRoot
    $candidates = @(
        Join-Path $targetDir 'x86_64-pc-windows-msvc\debug\koi-monitor.exe'
        Join-Path $targetDir 'debug\koi-monitor.exe'
        Join-Path $root 'src-tauri\target\x86_64-pc-windows-msvc\debug\koi-monitor.exe'
        Join-Path $root 'src-tauri\target\debug\koi-monitor.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Wait-KoiDevServer {
    param(
        [int]$Port = 1420,
        [int]$TimeoutSec = 90
    )

    $url = "http://localhost:$Port/"
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            return $true
        }
        catch {
            Start-Sleep -Milliseconds 400
        }
    }
    return $false
}

function Clear-KoiShellIconCache {
    param(
        [switch]$RestartExplorer
    )
    # Explorer garde l'icone PE en cache quand on ecrase koi-monitor.exe sur place.
    try {
        $ie4u = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
        if (Test-Path -LiteralPath $ie4u) {
            Start-Process -FilePath $ie4u -ArgumentList '-ClearIconCache' -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
        }
        if ($RestartExplorer) {
            $cacheDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer'
            Get-ChildItem -LiteralPath $cacheDir -Filter 'iconcache_*.db' -ErrorAction SilentlyContinue |
                ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 800
            Start-Process explorer
        }
    }
    catch {
        # Non bloquant — l'utilisateur peut relancer Explorer manuellement.
    }
}

function Get-KoiRceditPath {
    $dir = Join-Path $env:LOCALAPPDATA 'koi-monitor\tools'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $rcedit = Join-Path $dir 'rcedit-x64.exe'
    if (-not (Test-Path -LiteralPath $rcedit)) {
        Write-Host '  Telechargement rcedit (icone PE Windows)...'
        Invoke-WebRequest -Uri 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe' -OutFile $rcedit -UseBasicParsing
        Unblock-File -LiteralPath $rcedit -ErrorAction SilentlyContinue
    }
    return $rcedit
}

function Set-KoiExePeIcon {
    param(
        [Parameter(Mandatory = $true)][string]$ExePath,
        [Parameter(Mandatory = $true)][string]$IcoPath
    )
    if (-not (Test-Path -LiteralPath $ExePath)) { return $false }
    if (-not (Test-Path -LiteralPath $IcoPath)) { return $false }
    $rcedit = Get-KoiRceditPath
    & $rcedit $ExePath --set-icon $IcoPath | Out-Null
    return $LASTEXITCODE -eq 0
}

function Publish-KoiExeFile {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    $destDir = Split-Path -Parent $Destination
    if ($destDir) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    # Supprimer avant copie : invalide le cache d'icone Windows (path + ancien hash PE).
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Force
    }

    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    Unblock-File -LiteralPath $Destination -ErrorAction SilentlyContinue
}

function Publish-KoiExe {
    $source = Get-KoiExePath
    if (-not (Test-Path $source)) { return $null }

    $running = Get-Process -Name 'koi-monitor' -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host '  Arret koi-monitor.exe (publication)...'
        Stop-Process -Name 'koi-monitor' -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    $ico = Join-Path (Get-KoiRoot) 'src-tauri\icons\icon.ico'
    if (Test-Path -LiteralPath $ico) {
        Write-Host '  Application icone PE (rcedit)...'
        Set-KoiExePeIcon -ExePath $source -IcoPath $ico | Out-Null
    }

    $launchDir = Join-Path $env:LOCALAPPDATA 'koi-monitor'
    New-Item -ItemType Directory -Force -Path $launchDir | Out-Null
    $launch = Join-Path $launchDir 'koi-monitor.exe'
    Publish-KoiExeFile -Source $source -Destination $launch

    $mirrorDir = Join-Path (Get-KoiRoot) 'src-tauri\target\release'
    $mirror = Join-Path $mirrorDir 'koi-monitor.exe'
    Publish-KoiExeFile -Source $source -Destination $mirror

    if (Test-Path -LiteralPath $ico) {
        Set-KoiExePeIcon -ExePath $launch -IcoPath $ico | Out-Null
        Set-KoiExePeIcon -ExePath $mirror -IcoPath $ico | Out-Null
    }

    Clear-KoiShellIconCache -RestartExplorer

    return @{
        Launch = $launch
        Mirror = $mirror
    }
}

function Repair-KoiEnvVars {
    $repaired = @()

    if ($env:RUSTUP_TOOLCHAIN -match '[\\/]|\.exe') {
        Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue
        $repaired += 'RUSTUP_TOOLCHAIN session'
    }
    if ($env:CARGO -match 'rustup\.exe') {
        Remove-Item Env:CARGO -ErrorAction SilentlyContinue
        $repaired += 'CARGO session'
    }

    $badUser = [Environment]::GetEnvironmentVariable('RUSTUP_TOOLCHAIN', 'User')
    if ($badUser -match '[\\/]|\.exe') {
        [Environment]::SetEnvironmentVariable('RUSTUP_TOOLCHAIN', $null, 'User')
        $repaired += 'RUSTUP_TOOLCHAIN utilisateur'
    }
    $badCargo = [Environment]::GetEnvironmentVariable('CARGO', 'User')
    if ($badCargo -match 'rustup\.exe') {
        [Environment]::SetEnvironmentVariable('CARGO', $null, 'User')
        $repaired += 'CARGO utilisateur'
    }

    Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue
    return $repaired
}

function Refresh-KoiPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @()
    if ($machine) { $parts += $machine -split ';' }
    if ($user) { $parts += $user -split ';' }

    $prepend = @(
        (Join-Path $env:USERPROFILE '.cargo\bin')
        'C:\Program Files\nodejs'
        "${env:ProgramFiles(x86)}\nodejs"
    )
    foreach ($p in $prepend) {
        if ($p -and (Test-Path $p)) {
            $parts = @($p) + ($parts | Where-Object { $_ -and ($_ -ne $p) })
        }
    }

    $env:PATH = ($parts | Where-Object { $_ }) -join ';'
    if (Test-KoiMsvcToolchainInstalled) {
        Ensure-KoiRustToolchainLayout | Out-Null
    }
}

function Get-KoiToolchainRoot {
    $dir = Join-Path $env:USERPROFILE '.rustup\toolchains'
    if (-not (Test-Path $dir)) { return $null }
    $match = Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'stable-x86_64-pc-windows-msvc' } |
        Select-Object -First 1
    if ($match) { return $match.FullName }
    return $null
}

function Unblock-KoiRustTree {
    param([string]$Root)
    if (-not $Root -or -not (Test-Path $Root)) { return }
    Get-ChildItem $Root -File -ErrorAction SilentlyContinue |
        ForEach-Object { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue }
}

function Get-KoiPathWithoutCargoShims {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @()
    if ($machine) { $parts += $machine -split ';' }
    if ($user) { $parts += $user -split ';' }
    return @($parts | Where-Object {
            $_ -and
            ($_ -notmatch '\\\.cargo\\bin(?:\\|$)') -and
            ($_ -notmatch '\\AppData\\Local\\Temp\\koi-rust-toolchain\\bin(?:\\|$)')
        } | Select-Object -Unique)
}

function Ensure-KoiRustToolchainLayout {
    $srcRoot = Get-KoiToolchainRoot
    if (-not $srcRoot) { return $null }

    Unblock-KoiRustTree -Root $srcBin
    Unblock-KoiRustTree -Root (Join-Path $env:USERPROFILE '.cargo\bin')

    $dstRoot = Join-Path $env:TEMP 'koi-rust-toolchain'
    $dstBin = Join-Path $dstRoot 'bin'
    $srcBin = Join-Path $srcRoot 'bin'

    if (-not (Test-Path $dstBin) -or -not (Test-Path (Join-Path $dstBin 'cargo.exe'))) {
        if (Test-Path $dstRoot) {
            Remove-Item $dstRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Force -Path $dstBin | Out-Null
        foreach ($dir in @('lib', 'etc', 'share', 'libexec')) {
            $link = Join-Path $dstRoot $dir
            $target = Join-Path $srcRoot $dir
            if ((Test-Path $target) -and -not (Test-Path $link)) {
                New-Item -ItemType Junction -Path $link -Target $target -Force | Out-Null
            }
        }
        Get-ChildItem $srcBin -File -ErrorAction SilentlyContinue | ForEach-Object {
            $dest = Join-Path $dstBin $_.Name
            Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
            Unblock-File -LiteralPath $dest -ErrorAction SilentlyContinue
        }
    }

    $parts = @( $dstBin, 'C:\Program Files\nodejs', "${env:ProgramFiles(x86)}\nodejs" ) + (Get-KoiPathWithoutCargoShims)
    $env:PATH = ($parts | Where-Object { $_ } | Select-Object -Unique) -join ';'
    $env:RUSTUP_HOME = Join-Path $env:USERPROFILE '.rustup'
    Remove-Item Env:CARGO -ErrorAction SilentlyContinue
    Remove-Item Env:RUSTC -ErrorAction SilentlyContinue
    Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue

    return $dstBin
}

function Get-KoiCargoExe {
    $bin = Ensure-KoiRustToolchainLayout
    if (-not $bin) { return $null }
    $cargo = Join-Path $bin 'cargo.exe'
    if (Test-Path $cargo) { return $cargo }
    return $null
}

function Get-KoiRustupExe {
    if ($script:KoiRustupExe) { return $script:KoiRustupExe }
    $src = Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe'
    if (-not (Test-Path $src)) { return $null }
    $dir = Join-Path $env:TEMP 'koi-rustup-bin'
    $exe = Join-Path $dir 'rustup.exe'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -LiteralPath $src -Destination $exe -Force
    Unblock-File -LiteralPath $exe -ErrorAction SilentlyContinue
    $script:KoiRustupExe = $exe
    return $exe
}

function Test-KoiMsvcToolchainInstalled {
    $toolchainsDir = Join-Path $env:USERPROFILE '.rustup\toolchains'
    if (-not (Test-Path $toolchainsDir)) { return $false }
    return @(
        Get-ChildItem $toolchainsDir -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match 'windows-msvc' }
    ).Count -gt 0
}

function Invoke-KoiRustup {
    param([Parameter(Mandatory)][string[]]$RustupArgs)

    $rustup = Get-KoiRustupExe
    if (-not $rustup) {
        return @{ ExitCode = 1; Output = 'rustup.exe introuvable' }
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $rustup @RustupArgs 2>&1
        return @{
            ExitCode = $LASTEXITCODE
            Output   = ($output | Out-String).Trim()
        }
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

function Invoke-KoiCargo {
    param([Parameter(Mandatory)][string[]]$CargoArgs)

    $cargo = Get-KoiCargoExe
    if (-not $cargo) {
        return @{ ExitCode = 1; Output = 'cargo.exe introuvable (toolchain MSVC)' }
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $cargo @CargoArgs 2>&1
        return @{
            ExitCode = $LASTEXITCODE
            Output   = ($output | Out-String).Trim()
        }
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

function Test-KoiLinkExe {
    if (Get-Command link.exe -ErrorAction SilentlyContinue) {
        return $true
    }
    return $false
}

function Import-VsDevShell {
    if (Test-KoiLinkExe) { return $true }

    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path $vswhere)) { return $false }

    $installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if (-not $installPath) { return $false }

    $vsDevCmd = Join-Path $installPath 'Common7\Tools\VsDevCmd.bat'
    if (-not (Test-Path $vsDevCmd)) { return $false }

    $cmd = "`"$vsDevCmd`" -no_logo -arch=amd64 && set"
    $cmdExe = if ($env:ComSpec) { $env:ComSpec } else { 'C:\Windows\System32\cmd.exe' }
    $envLines = & $cmdExe /c $cmd 2>$null
    foreach ($line in $envLines) {
        if ($line -match '^(?<key>[^=]+?)=(?<val>.*)$') {
            $key = $Matches.key
            $val = $Matches.val
            if ($key -in @('PATH', 'LIB', 'LIBPATH', 'INCLUDE', 'VCToolsInstallDir', 'VCINSTALLDIR', 'VSINSTALLDIR')) {
                Set-Item -Path "Env:$key" -Value $val
            }
        }
    }
    return (Test-KoiLinkExe)
}

function Get-KoiEnvReport {
    $root = Get-KoiRoot
    $report = [ordered]@{
        Node          = $null
        Npm           = $null
        NodeModules   = Test-Path (Join-Path $root 'node_modules')
        Esbuild       = $null
        EsbuildOk     = $false
        MsvcToolchain = Test-KoiMsvcToolchainInstalled
        Rustup        = Test-Path (Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe')
        Cargo         = $null
        LinkExe       = Test-KoiLinkExe
        RustupToolchainSession = $env:RUSTUP_TOOLCHAIN
        CargoSession  = $env:CARGO
    }

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) { $report.Node = (& node --version 2>$null).Trim() }

    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) { $report.Npm = (& npm --version 2>$null).Trim() }

    $esbuildRoot = Join-Path $root 'node_modules\esbuild'
    if (Test-Path $esbuildRoot) {
        $pkg = Get-Content (Join-Path $esbuildRoot 'package.json') -Raw | ConvertFrom-Json
        $report.Esbuild = "$($pkg.name) $($pkg.version)"
    }

    if ($report.NodeModules -and $report.Node) {
        Push-Location $root
        try {
            $null = node --input-type=module -e "import esbuild from 'esbuild'; esbuild.transformSync('1',{loader:'js'});" 2>&1
            $report.EsbuildOk = ($LASTEXITCODE -eq 0)
        }
        finally {
            Pop-Location
        }
    }

    if ($report.Rustup) {
        $ver = Invoke-KoiCargo @('--version')
        if ($ver.ExitCode -eq 0) {
            $report.Cargo = $ver.Output
        }
    }

    return $report
}

function Write-KoiEnvReport([hashtable]$Report) {
    Write-Host '  --- Environnement ---'
    Write-Host "  Node:           $(if ($Report.Node) { $Report.Node } else { 'ABSENT' })"
    Write-Host "  npm:            $(if ($Report.Npm) { $Report.Npm } else { 'ABSENT' })"
    Write-Host "  node_modules:   $(if ($Report.NodeModules) { 'OK' } else { 'ABSENT' })"
    Write-Host "  esbuild:        $(if ($Report.Esbuild) { $Report.Esbuild } else { 'ABSENT' })"
    Write-Host "  esbuild test:   $(if ($Report.EsbuildOk) { 'OK' } else { 'ECHEC' })"
    Write-Host "  MSVC toolchain: $(if ($Report.MsvcToolchain) { 'OK' } else { 'ABSENT' })"
    Write-Host "  rustup:         $(if ($Report.Rustup) { 'OK' } else { 'ABSENT' })"
    Write-Host "  cargo:          $(if ($Report.Cargo) { $Report.Cargo } else { 'ECHEC' })"
    Write-Host "  link.exe:       $(if ($Report.LinkExe) { 'OK' } else { 'ABSENT' })"
    if ($Report.RustupToolchainSession) {
        Write-Host "  RUSTUP_TOOLCHAIN (session): $($Report.RustupToolchainSession)"
    }
    if ($Report.CargoSession) {
        Write-Host "  CARGO (session): $($Report.CargoSession)"
    }
}

function Write-KoiError {
    param(
        [string]$Message,
        [string]$Hint = 'koi.bat doctor'
    )
    Write-Host "[ERREUR] $Message"
    if ($Hint) {
        Write-Host "         Lancez: $Hint"
    }
}

function Write-CargoFailure {
    param(
        [string]$Context,
        [object]$Output
    )
    $msg = ([string]$Output).Trim()
    if ($msg -match 'Acces refuse|Accès refusé|Access denied|os error 5|-Zscript') {
        Write-KoiError "$Context - cargo bloque par Windows (Bureau / Defender)" 'koi.bat doctor'
        return
    }
    if ($msg) {
        Write-KoiError "$Context - $msg"
    } else {
        Write-KoiError $Context
    }
}

function Install-KoiMsvcToolchain {
    Write-Host '  Installation stable-x86_64-pc-windows-msvc...'
    $result = Invoke-KoiRustup @('toolchain', 'install', $script:KoiMsvcToolchain)
    if ($result.ExitCode -ne 0) {
        Write-Host "[ERREUR] $($result.Output)"
        return $false
    }
    $default = Invoke-KoiRustup @('default', $script:KoiMsvcToolchain)
    if ($default.ExitCode -ne 0) {
        Write-Host "[ERREUR] rustup default: $($default.Output)"
        return $false
    }
    Write-Host '  Toolchain MSVC installee'
    return $true
}

function Repair-KoiRustToolchain {
    Repair-KoiEnvVars | Out-Null
    Refresh-KoiPath

    if (-not (Test-KoiMsvcToolchainInstalled)) {
        if (-not (Install-KoiMsvcToolchain)) { return $false }
    } else {
        $default = Invoke-KoiRustup @('default', $script:KoiMsvcToolchain)
        if ($default.ExitCode -ne 0) {
            Write-Host "  [INFO] rustup default: $($default.Output)"
        }
    }

    $layoutRoot = Join-Path $env:TEMP 'koi-rust-toolchain'
    if (Test-Path $layoutRoot) {
        Remove-Item $layoutRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    Ensure-KoiRustToolchainLayout | Out-Null
    return $true
}

function Initialize-KoiEnv {
    param(
        [switch]$RequireNodeModules,
        [switch]$RequireCargo,
        [switch]$FrontendOnly,
        [switch]$Quiet
    )

    $repaired = Repair-KoiEnvVars
    if ($repaired.Count -gt 0 -and -not $Quiet) {
        Write-Host "  Vars reparees: $($repaired -join ', ')"
    }

    Refresh-KoiPath

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-KoiError 'Node.js introuvable' 'koi.bat setup'
        exit 1
    }

    if ($RequireNodeModules) {
        $root = Get-KoiRoot
        if (-not (Test-Path (Join-Path $root 'node_modules'))) {
            Write-KoiError 'Dependances absentes' 'koi.bat setup'
            exit 1
        }

        $esbuildRoot = Join-Path $root 'node_modules\esbuild'
        if (-not (Test-Path $esbuildRoot)) {
            Write-KoiError 'esbuild absent — npm install requis' 'koi.bat setup'
            exit 1
        }

        $pkg = Get-Content (Join-Path $esbuildRoot 'package.json') -Raw | ConvertFrom-Json
        Push-Location $root
        try {
            $null = node --input-type=module -e "import esbuild from 'esbuild'; esbuild.transformSync('1',{loader:'js'});" 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-KoiError 'esbuild inaccessible (Defender ?)' 'koi.bat doctor'
                exit 1
            }
            if (-not $Quiet) {
                if ($pkg.name -eq 'esbuild-wasm') {
                    Write-Host "  esbuild-wasm $($pkg.version)"
                } else {
                    Write-Host "  esbuild $($pkg.version)"
                }
            }
        }
        finally {
            Pop-Location
        }
    }

    if ($FrontendOnly) {
        return
    }

    Import-VsDevShell | Out-Null

    if (-not (Test-KoiMsvcToolchainInstalled)) {
        Write-KoiError 'Toolchain MSVC absente (Tauri requiert msvc, pas gnu)' 'koi.bat doctor'
        exit 1
    }

    if (-not (Get-KoiRustupExe)) {
        Write-KoiError 'rustup introuvable — installez Rust: https://rustup.rs' 'koi.bat setup'
        exit 1
    }

    if ($RequireCargo) {
        Initialize-KoiCargoTargetDir | Out-Null
        Push-Location (Join-Path (Get-KoiRoot) 'src-tauri')
        try {
            $version = Invoke-KoiCargo @('--version')
            if ($version.ExitCode -ne 0) {
                Write-Host '  Nouvelle tentative apres reparation toolchain...'
                Repair-KoiRustToolchain | Out-Null
                $version = Invoke-KoiCargo @('--version')
            }
            if ($version.ExitCode -ne 0) {
                Write-CargoFailure -Context 'cargo --version' -Output $version.Output
                exit 1
            }
            $meta = Invoke-KoiCargo @('metadata', '--no-deps', '--format-version', '1')
            if ($meta.ExitCode -ne 0) {
                Write-CargoFailure -Context 'cargo metadata' -Output $meta.Output
                exit 1
            }
            if (-not $Quiet) {
                Write-Host "  $($version.Output)"
                Write-Host '  Toolchain MSVC pret (layout temporaire anti-Defender)'
            }
        }
        finally {
            Pop-Location
        }

        if (-not (Test-KoiLinkExe)) {
            Write-Host '  [ATTENTION] link.exe absent — installez Visual Studio Build Tools (C++)'
            Write-Host '              https://visualstudio.microsoft.com/visual-cpp-build-tools/'
        }
    }
}

function Invoke-KoiClean {
    $root = Get-KoiRoot
    $running = Get-Process -Name 'koi-monitor' -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host '  Arret koi-monitor.exe...'
        Stop-Process -Name 'koi-monitor' -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    foreach ($rel in @('dist', 'src-tauri\gen')) {
        $path = Join-Path $root $rel
        if (Test-Path $path) {
            Write-Host "  Suppression $rel\..."
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    $localTarget = Join-Path $env:LOCALAPPDATA 'koi-monitor\target'
    if (Test-Path $localTarget) {
        Write-Host '  Suppression target local (AppData)...'
        Remove-Item $localTarget -Recurse -Force -ErrorAction SilentlyContinue
    }

    $legacyTarget = Join-Path $root 'src-tauri\target'
    if (Test-Path $legacyTarget) {
        Write-Host '  Suppression src-tauri\target\...'
        Remove-Item $legacyTarget -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-KoiTauriBuild {
    Push-Location (Get-KoiRoot)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & npm run tauri -- build --no-bundle --ci 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    finally {
        $ErrorActionPreference = $prev
        Pop-Location
    }
}

function Invoke-Npm {
    param([Parameter(Mandatory)][string[]]$NpmArgs)

    Push-Location (Get-KoiRoot)
    try {
        & npm @NpmArgs
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    finally {
        Pop-Location
    }
}

function Test-KoiAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-KoiNode {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $ver = (& node --version 2>$null).Trim()
        Write-Host "  Node.js deja present: $ver"
        return $true
    }

    Write-Host '  Installation Node.js 20 LTS...'
    $msi = Join-Path $env:TEMP 'koi-nodejs-20.msi'
    try {
        Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile $msi -UseBasicParsing
        $proc = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Host "[ERREUR] Installation Node.js echouee (code $($proc.ExitCode))"
            return $false
        }
        Start-Sleep -Seconds 3
        Refresh-KoiPath
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Write-Host '[ERREUR] Node.js installe mais introuvable — redemarrez le terminal'
            return $false
        }
        Write-Host "  Node.js installe: $(node --version)"
        return $true
    }
    finally {
        Remove-Item $msi -Force -ErrorAction SilentlyContinue
    }
}

function Install-KoiRust {
    if (Get-Command rustc -ErrorAction SilentlyContinue) {
        $ver = (& rustc --version 2>$null).Trim()
        Write-Host "  Rust deja present: $ver"
        Refresh-KoiPath
        if (-not (Test-KoiMsvcToolchainInstalled)) {
            return (Repair-KoiRustToolchain)
        }
        return $true
    }

    Write-Host '  Installation Rust (MSVC)...'
    $installer = Join-Path $env:TEMP 'koi-rustup-init.exe'
    try {
        Invoke-WebRequest -Uri 'https://win.rustup.rs' -OutFile $installer -UseBasicParsing
        $proc = Start-Process -FilePath $installer -ArgumentList @(
            '-y',
            '--default-toolchain', $script:KoiMsvcToolchain,
            '--profile', 'minimal'
        ) -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Host "[ERREUR] rustup-init echoue (code $($proc.ExitCode))"
            return $false
        }
        Start-Sleep -Seconds 3
        Refresh-KoiPath
        $script:KoiRustupExe = $null
        if (-not (Get-KoiRustupExe)) {
            Write-Host '[ERREUR] rustup installe mais introuvable — redemarrez le terminal'
            return $false
        }
        Write-Host '  Rust installe (MSVC)'
        return $true
    }
    finally {
        Remove-Item $installer -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-KoiDefenderFix {
    param([switch]$NonInteractive)

    $fixScript = Join-Path $PSScriptRoot 'fix-windows-access.ps1'
    if (-not (Test-Path $fixScript)) {
        Write-Host '[ERREUR] fix-windows-access.ps1 introuvable'
        return $false
    }

    if (Test-KoiAdmin) {
        Write-Host '  Correctif Defender (admin)...'
        if ($NonInteractive) {
            & powershell -NoProfile -ExecutionPolicy Bypass -File $fixScript -NonInteractive
        } else {
            & $fixScript
        }
        return ($LASTEXITCODE -eq 0)
    }

    if ($NonInteractive) {
        Write-Host '  [INFO] Correctif Defender requiert admin — ignore en mode CI'
        return $false
    }

    $answer = Read-Host 'Appliquer le correctif Defender ? (O/N)'
    if ($answer -notmatch '^[OoYy]') { return $false }

    Write-Host '  Elevation administrateur...'
    Start-Process powershell -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', "`"$fixScript`""
    ) -Wait
    Refresh-KoiPath
    return $true
}
