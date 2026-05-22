[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$fullClasses = @('Display','Net','Media','MEDIA','Bluetooth','SCSIAdapter','HDC','FIRMWARE')
$simpClasses = @('Display','Net','Media','MEDIA','Bluetooth')

function Count-Drivers($classes) {
    $filter = ($classes | ForEach-Object { "DeviceClass='$_'" }) -join ' OR '
    $query = "SELECT DeviceName, DeviceClass FROM Win32_PnPSignedDriver WHERE $filter"
    $items = @(Get-CimInstance -Query $query | Where-Object { $_.DeviceName -and $_.DriverVersion })
    return $items
}

$all = Count-Drivers $fullClasses
$simp = Count-Drivers $simpClasses
Write-Host "Raw WMI full: $($all.Count)"
Write-Host "Raw WMI simplified: $($simp.Count)"
Write-Host "`nFull by class:"
$all | Group-Object DeviceClass | Sort-Object Count -Descending | Format-Table Name, Count
Write-Host "Sample full names:"
$all | Select-Object -First 25 DeviceName, DeviceClass | Format-Table -AutoSize
