param(
    [int]$Port = 1420,
    [switch]$Quiet
)

$owners = @(
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
)

if ($owners.Count -eq 0) {
    if (-not $Quiet) {
        Write-Host "  Port $Port libre."
    }
    exit 0
}

foreach ($owner in $owners) {
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
}

if (-not $Quiet) {
    $n = $owners.Count
    Write-Host "  Port $Port libere ($n processus)."
}

exit 0
