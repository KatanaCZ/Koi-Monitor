# Extract user-facing release notes for a tag (e.g. v1.1.2 -> ### Pour vous from ## [1.1.2]).
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
$pourVousPattern = '(?ms)^### Pour vous\s*\r?\n(.*?)(?=^### |\z)'
$pourVousMatch = [regex]::Match($section, $pourVousPattern)

if ($pourVousMatch.Success) {
    $body = $pourVousMatch.Groups[1].Value.Trim()
} else {
    Write-Warning "CHANGELOG.md: pas de ### Pour vous pour [$version] - export de la section complete (legacy)."
    $body = $section
}

$title = "Koi Monitor v$version"

@(
    "# $title"
    ''
    $body
    ''
    '---'
    ''
    '**Telechargement :** fichier **`koi-monitor.exe`** ci-dessous - Windows 10/11, portable, sans installateur.'
    ''
    "[Changelog complet (technique)](https://github.com/KatanaCZ/Koi-Monitor/blob/master/CHANGELOG.md)"
) -join "`n"
