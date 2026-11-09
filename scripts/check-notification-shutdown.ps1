$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$assembly=[Reflection.Assembly]::LoadFrom((Join-Path (Get-Location) '.runtime/notification-bridge/DriveDeck.NotificationBridge.exe'))
$type=$assembly.GetType('NotificationBridge')
$flags=[Reflection.BindingFlags]'Instance,NonPublic'
$bridge=[Activator]::CreateInstance($type,$flags,$null,@('drivedeck-notifications-00000000000000000000000000000000'),$null)
$name='drivedeck-shutdown-check-'+[Guid]::NewGuid().ToString('N')
$server=New-Object IO.Pipes.NamedPipeServerStream($name)
$client=New-Object IO.Pipes.NamedPipeClientStream('.', $name, [IO.Pipes.PipeDirection]::Out)
$waiting=$server.WaitForConnectionAsync();$client.Connect(3000);$waiting.GetAwaiter().GetResult()
$writer=New-Object IO.StreamWriter($client)
$writer.Write('pending')
$type.GetField('pipe',$flags).SetValue($bridge,$client)
$type.GetField('writer',$flags).SetValue($bridge,$writer)
$server.Dispose();$client.Dispose()
$type.GetMethod('Shutdown',$flags).Invoke($bridge,@())
$type.GetMethod('Shutdown',$flags).Invoke($bridge,@())
$type.GetMethod('Send',$flags).Invoke($bridge,@(@{type='status'}))
if($null -ne $type.GetField('writer',$flags).GetValue($bridge)){throw 'Writer was not cleared'}
$bridge.Dispose()
Write-Output 'PASS disconnected pipe, buffered writer disposal, repeated shutdown and post-shutdown send'
