param([Parameter(Mandatory=$true)][ValidatePattern('^drivedeck-notifications-[a-f0-9]{32}$')][string]$PipeName,[switch]$Install)
$ErrorActionPreference='Stop'
try {
 $package=Get-AppxPackage -Name DriveDeck.NotificationBridge.Preview
 $requiredVersion=[version]'0.1.2.0'
 if(-not $package -and -not $Install){throw 'Enable notifications in DriveDeck to install the preview bridge.'}
 if($package -and [version]$package.Version -lt $requiredVersion -and -not $Install){throw 'Enable Windows access in DriveDeck to update the notification bridge.'}
 if(-not $package -or [version]$package.Version -lt $requiredVersion){
  $installer=Join-Path $PSScriptRoot 'install-preview.ps1';$msix=Join-Path $PSScriptRoot 'DriveDeck.NotificationBridge.msix'
  $argsText='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$installer+'" -PackagePath "'+$msix+'"'
  $process=Start-Process powershell.exe -ArgumentList $argsText -Verb RunAs -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw 'Bridge installation did not complete.'}
  $package=Get-AppxPackage -Name DriveDeck.NotificationBridge.Preview
 }
 if(-not $package){throw 'The notification bridge is not installed for this Windows account.'}
 Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
[ComImport,Guid("2e941141-7f97-4756-ba1d-9decde894a3d"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]interface IActivateDriveDeck{int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)]string app,[MarshalAs(UnmanagedType.LPWStr)]string args,uint flags,out uint pid);}
public class DriveDeckActivation{public static uint Run(string id,string args){object obj=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")));uint pid;int hr=((IActivateDriveDeck)obj).ActivateApplication(id,args,0,out pid);Marshal.ThrowExceptionForHR(hr);return pid;}}
"@
 $pidValue=[DriveDeckActivation]::Run($package.PackageFamilyName+'!Bridge',$PipeName)
 @{pid=$pidValue} | ConvertTo-Json -Compress
} catch { @{error='Could not start the Windows notification bridge. '+$_.Exception.Message} | ConvertTo-Json -Compress;exit 1 }
