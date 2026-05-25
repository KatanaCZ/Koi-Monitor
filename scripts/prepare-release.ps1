# Promote [Unreleased] → [x.y.z] - date, scaffold [Unreleased], sync app version everywhere.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$changelogPath = Join-Path $root 'CHANGELOG.md'
$content = Get-Content -LiteralPath $changelogPath -Raw -Encoding UTF8
$date = Get-Date -Format 'yyyy-MM-dd'

if ($content -notmatch '(?m)^## \[Unreleased\]') {
    Write-Error 'CHANGELOG.md: section ## [Unreleased] introuvable.'
}
if ($content -match "(?m)^## \[$([regex]::Escape($Version))\] - ") {
    Write-Error "CHANGELOG.md: section ## [$Version] existe déjà."
}

# --- CHANGELOG ---
$unreleasedBlock = @"
## [Unreleased]

### Ajout$([char]0x00E9)

### Modifi$([char]0x00E9)

### Corrig$([char]0x00E9)

"@
$content = [regex]::Replace($content, '(?m)^## \[Unreleased\]', "## [$Version] - $date", 1)
$content = [regex]::Replace(
    $content,
    "(?m)^## \[$([regex]::Escape($Version))\] - $([regex]::Escape($date))",
    "$unreleasedBlock## [$Version] - $date",
    1
)

$compareLink = "[Unreleased]: https://github.com/KatanaCZ/Koi-Monitor/compare/v$Version...HEAD"
$versionLink = "[$Version]: https://github.com/KatanaCZ/Koi-Monitor/releases/tag/v$Version"
$footerPattern = '(?m)^\[Unreleased\]: .*$'
if ($content -match $footerPattern) {
    $content = [regex]::Replace($content, $footerPattern, $compareLink, 1)
    if ($content -notmatch "(?m)^\[$([regex]::Escape($Version))\]: ") {
        $content = $content.TrimEnd() + "`n$versionLink`n"
    }
} else {
    $content = $content.TrimEnd() + "`n`n$compareLink`n$versionLink`n"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($changelogPath, ($content.TrimEnd() + "`n"), $utf8NoBom)
Write-Host "CHANGELOG.md -> v$Version ($date)"

# --- App version (Paramètres -> À propos, binaire Tauri, npm) ---
function Set-FileVersion {
    param([string]$Path, [scriptblock]$Updater)
    $resolved = Join-Path $root $Path
    if (-not (Test-Path -LiteralPath $resolved)) {
        Write-Error "Fichier introuvable: $Path"
    }
    $raw = Get-Content -LiteralPath $resolved -Raw -Encoding UTF8
    $updated = & $Updater $raw
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($resolved, $updated, $utf8NoBom)
    Write-Host "  $Path"
}

Set-FileVersion 'src/appVersion.ts' {
    param($raw)
    [regex]::Replace($raw, "(?m)^export const APP_VERSION = '[^']+';", "export const APP_VERSION = '$Version';")
}

Set-FileVersion 'package.json' {
    param($raw)
    [regex]::Replace($raw, '(?<="version": ")[^"]+', $Version, 1)
}

Set-FileVersion 'package-lock.json' {
    param($raw)
    $n = 0
    [regex]::Replace($raw, '(?<="version": ")[^"]+', { param($m) $script:n++; if ($script:n -le 2) { $Version } else { $m.Value } })
}

Set-FileVersion 'src-tauri/tauri.conf.json' {
    param($raw)
    [regex]::Replace($raw, '(?<="version": ")[^"]+', $Version, 1)
}

Set-FileVersion 'src-tauri/Cargo.toml' {
    param($raw)
    [regex]::Replace($raw, '(?m)^version = "[^"]+"', "version = `"$Version`"", 1)
}

Set-FileVersion 'src-tauri/Cargo.lock' {
    param($raw)
    [regex]::Replace($raw, '(?ms)(\[\[package\]\]\r?\nname = "koi-monitor"\r?\nversion = ")[^"]+', "`${1}$Version", 1)
}

Set-FileVersion 'README.md' {
    param($raw)
    [regex]::Replace($raw, '(?<=img\.shields\.io/badge/Version-)[^-]+', $Version, 1)
}

Write-Host ""
Write-Host "Version v$Version synchronisée (appVersion, npm, Tauri, Cargo, README badge)."
Write-Host ""
Write-Host "Prochaines étapes:"
Write-Host "  git add CHANGELOG.md src/appVersion.ts package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock README.md"
Write-Host "  git commit -m `"chore(release): prepare v$Version`""
Write-Host "  git push origin master"
Write-Host "  git tag v$Version && git push origin v$Version"
