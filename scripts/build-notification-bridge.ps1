$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$out=Join-Path $root '.runtime/notification-bridge'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$csc='C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$framework='C:/Windows/Microsoft.NET/Framework64/v4.0.30319'
& $csc /nologo /target:winexe /platform:x64 "/out:$out/DriveDeck.NotificationBridge.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/reference:$framework/System.Runtime.WindowsRuntime.dll" "/reference:C:/Windows/Microsoft.NET/assembly/GAC_MSIL/System.Runtime/v4.0_4.0.0.0__b03f5f7f11d50a3a/System.Runtime.dll" '/reference:C:/Program Files (x86)/Windows Kits/10/UnionMetadata/10.0.26100.0/Windows.winmd' (Join-Path $root 'native\notifications\Bridge.cs')
if($LASTEXITCODE -ne 0){throw 'Notification bridge compilation failed'}
Write-Output $out
