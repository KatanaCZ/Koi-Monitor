#Extract the CHANGELOG section for a release tag (e.g. v1.0.1 → ## [1.0.1]).
param(
    [Parameter(Mandatory = $true)]
    [string]$Tag
)

$ErrorActionPreference = 'Stop'
$version = $Tag -replace '^v', ''
$changelogPath = (Resolve-Path (Join-Path $PSScriptRoot '..\CHANGELOG.md')).Path

$content = Get-Content -LiteralPath $changelogPath -Raw -Encoding UTF8
$pattern = "(?ms)^## \[$([regex]::Escape($version))\][^\n]*\r?\n(.*?)(?=^## \[|\z)"
$match = [regex]::Match($content, $pattern)

if (-not $match.Success) {
    Write-Error "CHANGELOG.md: section ## [$version] introuvable. Lancez scripts/prepare-release.ps1 -Version $version avant le tag."
}

$section = $match.Groups[1].Value.Trim()
$title = "Koi Monitor v$version"

@(
    "# $title"
    ''
    $section
    ''
    '---'
    ''
    '**Téléchargement :** fichier **`koi-monitor.exe`** ci-dessous — Windows 10/11, portable, sans installateur.'
    ''
    "[Voir le changelog complet](https://github.com/KatanaCZ/Koi-Monitor/blob/master/CHANGELOG.md)"
) -join "`n"
