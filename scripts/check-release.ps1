param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Read-ProjectFile([string]$Name) {
    Get-Content -LiteralPath (Join-Path $Root $Name) -Raw -Encoding utf8
}

$manifest = Read-ProjectFile 'Cargo.toml'
$package = [regex]::Match($manifest, '(?ms)^\[package\]\s*\r?\n(?<body>.*?)(?=^\[|\z)')
$versionMatch = [regex]::Match($package.Groups['body'].Value, '(?m)^version\s*=\s*"([^"]+)"')
if (-not $versionMatch.Success) { throw 'Cargo.toml: missing package version.' }
$version = $versionMatch.Groups[1].Value

$lock = Read-ProjectFile 'Cargo.lock'
$packages = [regex]::Matches($lock, '(?ms)^\[\[package\]\]\s*\r?\n(?<body>.*?)(?=^\[\[package\]\]|\z)')
$koi = @($packages | Where-Object { $_.Groups['body'].Value -match '(?m)^name = "koi-monitor"\r?$' })
if ($koi.Count -ne 1) { throw 'Cargo.lock: expected one koi-monitor package.' }
$lockedVersion = [regex]::Match($koi[0].Groups['body'].Value, '(?m)^version = "([^"]+)"').Groups[1].Value
if ($lockedVersion -ne $version) { throw "Cargo.lock version '$lockedVersion' differs from '$version'." }

$readme = Read-ProjectFile 'README.md'
$sourceVersion = [regex]::Matches($readme, 'The current source version is `([^`]+)`')
if ($sourceVersion.Count -ne 1 -or $sourceVersion[0].Groups[1].Value -ne $version) {
    throw "README.md: expected one current source version declaration for '$version'."
}

$changelog = Read-ProjectFile 'CHANGELOG.md'
if ([regex]::Matches($changelog, '(?m)^## \[Unreleased\]\r?$').Count -ne 1) {
    throw 'CHANGELOG.md: expected one Unreleased section.'
}
$escapedVersion = [regex]::Escape($version)
$sections = [regex]::Matches($changelog, "(?ms)^## \[$escapedVersion\](?: - \d{4}-\d{2}-\d{2})?\r?`n(?<body>.*?)(?=^## |\z)")
if ($sections.Count -ne 1) { throw "CHANGELOG.md: expected one section for '$version'." }
$notes = [regex]::Match($sections[0].Groups['body'].Value, '(?ms)^### For you\r?\n(?<body>.*?)(?=^### |\z)')
if (-not $notes.Success -or $notes.Groups['body'].Value -notmatch '(?m)^- \S') {
    throw "CHANGELOG.md: '$version' needs nonempty For you notes."
}

Write-Output "Release metadata is consistent: $version."
