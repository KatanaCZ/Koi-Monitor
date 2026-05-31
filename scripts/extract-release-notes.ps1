# Extract user-facing release notes for a tag (e.g. v1.1.2 -> ### For you from ## [1.1.2]).
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
$forYouPattern = '(?ms)^### For you\s*\r?\n(.*?)(?=^### |\z)'
$forYouMatch = [regex]::Match($section, $forYouPattern)

if ($forYouMatch.Success) {
    $body = $forYouMatch.Groups[1].Value.Trim()
} else {
    Write-Warning "CHANGELOG.md: no ### For you for [$version] - exporting full section (legacy)."
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
    '**Download:** **`koi-monitor.exe`** below — Windows 10/11, portable, no installer.'
    ''
    "[Full changelog (technical)](https://github.com/KatanaCZ/Koi-Monitor/blob/master/CHANGELOG.md)"
) -join "`n"
