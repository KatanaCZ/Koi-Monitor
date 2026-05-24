#Requires -RunAsAdministrator
# Clic droit > Executer en tant qu administrateur

param([switch]$NonInteractive)

$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "Koi Monitor - correctif acces Windows"
Write-Host "======================================"
Write-Host ""

$exclusions = @(
    $Root
    (Join-Path $env:LOCALAPPDATA 'koi-monitor')
    (Join-Path $env:USERPROFILE ".cargo")
    (Join-Path $env:USERPROFILE ".rustup")
    "C:\Program Files\nodejs"
    (Join-Path $Root "node_modules")
)

foreach ($path in $exclusions) {
    if (-not (Test-Path $path)) { continue }
    Add-MpPreference -ExclusionPath $path | Out-Null
    Write-Host "  Exclusion chemin: $path"
}

foreach ($proc in @("node.exe", "esbuild.exe", "cargo.exe", "rustc.exe", "koi-monitor.exe")) {
    Add-MpPreference -ExclusionProcess $proc | Out-Null
    Write-Host "  Exclusion processus: $proc"
}

$allowedApps = @(
    "C:\Program Files\nodejs\node.exe"
    (Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe")
    (Join-Path $env:USERPROFILE ".cargo\bin\rustc.exe")
    (Join-Path $env:USERPROFILE ".cargo\bin\rustup.exe")
    (Join-Path $env:USERPROFILE ".rustup\toolchains\stable-x86_64-pc-windows-msvc\bin\cargo.exe")
    (Join-Path $env:USERPROFILE ".rustup\toolchains\stable-x86_64-pc-windows-msvc\bin\rustc.exe")
    (Join-Path $env:LOCALAPPDATA "koi-monitor\koi-monitor.exe")
)

foreach ($app in $allowedApps) {
    if (-not (Test-Path $app)) { continue }
    Add-MpPreference -ControlledFolderAccessAllowedApplications $app | Out-Null
    Unblock-File -LiteralPath $app -ErrorAction SilentlyContinue
    Write-Host "  Acces controle autorise: $app"
}

$unblockRoots = @(
    (Join-Path $env:USERPROFILE ".cargo\bin")
    (Join-Path $env:USERPROFILE ".rustup")
    (Join-Path $Root "node_modules\@esbuild")
)

foreach ($dir in $unblockRoots) {
    if (-not (Test-Path $dir)) { continue }
    Get-ChildItem -Path $dir -Recurse -Include "cargo.exe","rustc.exe","rustup.exe","esbuild.exe" -ErrorAction SilentlyContinue |
        ForEach-Object { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "Termine. Executez: npm install"
$shimCargo = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
if ((Test-Path $shimCargo) -and (Get-Item $shimCargo).Length -eq 0) {
    Write-Host "cargo.exe shim vide detecte - apres ce script, lancez:"
    Write-Host "  rustup default stable-x86_64-pc-windows-msvc"
}
Write-Host "Puis relancez koi.bat build, koi.bat dev ou koi.bat devfast"
Write-Host ""
if (-not $NonInteractive) {
    Read-Host "Appuyez sur Entree pour fermer"
}
