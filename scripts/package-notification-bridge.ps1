$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$bridgeOut=Join-Path $taskRoot '.runtime/notification-bridge'
Copy-Item -LiteralPath (Join-Path $taskRoot 'native/notifications/AppxManifest.xml') -Destination (Join-Path $bridgeOut 'AppxManifest.xml')
Add-Type -AssemblyName System.Drawing
$assets=Join-Path $bridgeOut 'Assets';New-Item -ItemType Directory -Force -Path $assets | Out-Null
$icon=[System.Drawing.Image]::FromFile((Join-Path $taskRoot 'src/renderer/assets/icon.png'))
foreach($size in @(44,150,50)){$bitmap=New-Object System.Drawing.Bitmap($icon,$size,$size);$name=if($size -eq 50){'StoreLogo.png'}else{"Logo$size.png"};$bitmap.Save((Join-Path $assets $name),[System.Drawing.Imaging.ImageFormat]::Png);$bitmap.Dispose()};$icon.Dispose()
$package=Join-Path $taskRoot 'native/notifications/DriveDeck.NotificationBridge.msix'
& 'C:/Program Files (x86)/Windows Kits/10/bin/10.0.26100.0/x64/makeappx.exe' pack /d $bridgeOut /p $package /o
if($LASTEXITCODE -ne 0){throw 'Notification bridge packaging failed'}
