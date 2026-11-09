param([Parameter(Mandatory=$true)][string]$PackagePath)
$ErrorActionPreference='Stop'
Add-AppxPackage -Path $PackagePath -AllowUnsigned
