# Promote [Unreleased] → [x.y.z] - date and scaffold a fresh [Unreleased] section.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$changelogPath = (Resolve-Path (Join-Path $PSScriptRoot '..\CHANGELOG.md')).Path
$content = Get-Content -LiteralPath $changelogPath -Raw
$date = Get-Date -Format 'yyyy-MM-dd'

if ($content -notmatch '(?m)^## \[Unreleased\]') {
    Write-Error 'CHANGELOG.md: section ## [Unreleased] introuvable.'
}
if ($content -match "(?m)^## \[$([regex]::Escape($Version))\]") {
    Write-Error "CHANGELOG.md: section ## [$Version] existe déjà."
}

# 1. Rename current Unreleased block (with its bullets) to the new version.
$content = [regex]::Replace($content, '(?m)^## \[Unreleased\]', "## [$Version] - $date", 1)

# 2. Insert empty Unreleased template after the intro paragraph.
$unreleasedBlock = @"
## [Unreleased]

### Ajouté

### Modifié

### Corrigé

"@
$insertAfter = '(?m)(Format inspiré[^\n]*\n\n)'
$content = [regex]::Replace($content, $insertAfter, "`${1}$unreleasedBlock", 1)

# 3. Footer compare links (Keep a Changelog style).
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

Set-Content -LiteralPath $changelogPath -Value ($content.TrimEnd() + "`n") -Encoding utf8NoBOM
Write-Host "CHANGELOG.md prêt pour v$Version ($date)."
Write-Host ""
Write-Host "Prochaines étapes:"
Write-Host "  git add CHANGELOG.md"
Write-Host "  git commit -m `"chore(release): prepare v$Version`""
Write-Host "  git push origin master"
Write-Host "  git tag v$Version && git push origin v$Version"
