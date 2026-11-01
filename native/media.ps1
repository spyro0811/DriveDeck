$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$taskAdapter = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and
    $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await-Operation($Operation, [Type]$ResultType) {
    $task = $taskAdapter.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    if (-not $task.Wait(4000)) { throw 'Windows media request timed out.' }
    return $task.GetAwaiter().GetResult()
}

function Write-Message($Message) {
    [Console]::Out.WriteLine(($Message | ConvertTo-Json -Compress -Depth 5))
    [Console]::Out.Flush()
}

function Write-Trace($Name) {
    if ($env:DRIVEDECK_MEDIA_TRACE -eq '1') { Write-Message @{ type = 'trace'; data = $Name } }
}

try {
    Write-Trace 'Requesting Windows media manager'
    $manager = Await-Operation ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    Write-Trace 'Windows media manager ready'
    $inputReader = [System.IO.StreamReader]::new([Console]::OpenStandardInput())
    Write-Trace 'Opening command input'
    $inputTask = $inputReader.ReadLineAsync()
    Write-Trace 'Command input ready'
    $lastPoll = [DateTime]::MinValue
    $lastTrack = ''
    $artwork = $null
    while ($true) {
        if ($inputTask.IsCompleted) {
            $line = $inputTask.GetAwaiter().GetResult()
            if ($null -eq $line) { break }
            $request = $null
            try {
                $request = $line | ConvertFrom-Json
                $session = $manager.GetCurrentSession()
                if ($null -eq $session) { throw 'No active media session.' }
                $operation = switch ($request.action) {
                    'seek' {
                        if (-not $session.GetPlaybackInfo().Controls.IsPlaybackPositionEnabled) { throw 'This player does not support seeking.' }
                        $timelineNow = $session.GetTimelineProperties()
                        $seconds = [double]$request.position
                        $maximum = ($timelineNow.EndTime - $timelineNow.StartTime).TotalSeconds
                        if ([double]::IsNaN($seconds) -or [double]::IsInfinity($seconds) -or $seconds -lt 0 -or $seconds -gt $maximum) { throw 'Invalid playback position.' }
                        $ticks = $timelineNow.StartTime.Ticks + [TimeSpan]::FromSeconds($seconds).Ticks
                        $session.TryChangePlaybackPositionAsync([int64]$ticks)
                    }
                    'toggle' { $session.TryTogglePlayPauseAsync() }
                    'next' { $session.TrySkipNextAsync() }
                    'previous' { $session.TrySkipPreviousAsync() }
                    default { throw 'Unknown media action.' }
                }
                $result = Await-Operation $operation ([bool])
                Write-Message @{ type = 'result'; id = $request.id; ok = $result }
                $lastPoll = [DateTime]::MinValue
            } catch {
                if ($null -ne $request) { Write-Message @{ type = 'result'; id = $request.id; ok = $false; error = $_.Exception.Message } }
            }
            $inputTask = $inputReader.ReadLineAsync()
        }
        if (([DateTime]::UtcNow - $lastPoll).TotalMilliseconds -ge 900) {
            $lastPoll = [DateTime]::UtcNow
            try {
                $session = $manager.GetCurrentSession()
                if ($null -eq $session) {
                    $lastTrack = ''; $artwork = $null
                    Write-Message @{ type = 'state'; data = @{ available = $false } }
                } else {
                    $properties = Await-Operation ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                    $playback = $session.GetPlaybackInfo()
                    $timeline = $session.GetTimelineProperties()
                    $trackKey = "$($session.SourceAppUserModelId)|$($properties.Title)|$($properties.Artist)|$($properties.AlbumTitle)"
                    if ($trackKey -ne $lastTrack) {
                        $lastTrack = $trackKey; $artwork = $null
                        if ($null -ne $properties.Thumbnail) {
                            Write-Trace 'Reading media artwork'
                            $stream = $null; $reader = $null
                            try {
                                $stream = Await-Operation ($properties.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime])
                                $randomStreamType = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
                                $contentType = [Windows.Storage.Streams.IContentTypeProvider, Windows.Storage.Streams, ContentType = WindowsRuntime]
                                $streamSize = $randomStreamType.GetProperty('Size').GetValue($stream, $null)
                                $mime = $contentType.GetProperty('ContentType').GetValue($stream, $null)
                                Write-Trace ("Artwork bytes: ${streamSize}; MIME: ${mime}")
                                if ($streamSize -gt 0 -and $streamSize -le 1048576) {
                                    $imageInput = $randomStreamType.GetMethod('GetInputStreamAt').Invoke($stream, @([uint64]0))
                                    $reader = [Windows.Storage.Streams.DataReader]::new($imageInput)
                                    $loaded = Await-Operation ($reader.LoadAsync([uint32]$streamSize)) ([uint32])
                                    $bytes = New-Object byte[] $loaded
                                    $reader.ReadBytes($bytes)
                                    if ($mime -eq 'image/jpg') { $mime = 'image/jpeg' }
                                    if ($mime -in @('image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif')) {
                                        $artwork = "data:${mime};base64,$([Convert]::ToBase64String($bytes))"
                                    }
                                }
                            } catch { $artwork = $null; Write-Trace ('Artwork: ' + $_.Exception.Message) }
                            finally {
                                if ($null -ne $reader) { try { ([System.IDisposable]$reader).Dispose() } catch {} }
                                if ($null -ne $stream) { try { ([System.IDisposable]$stream).Dispose() } catch {} }
                            }
                        }
                    }
                    $duration = [Math]::Max(0, ($timeline.EndTime - $timeline.StartTime).TotalSeconds)
                    $position = [Math]::Max(0, ($timeline.Position - $timeline.StartTime).TotalSeconds)
                    if ($playback.PlaybackStatus.ToString() -eq 'Playing') {
                        $position += [Math]::Max(0, ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds)
                    }
                    Write-Message @{ type = 'state'; data = @{
                        available = $true; title = $properties.Title; artist = $properties.Artist;
                        album = $properties.AlbumTitle; source = $session.SourceAppUserModelId;
                        playing = ($playback.PlaybackStatus.ToString() -eq 'Playing');
                        position = [Math]::Min($position, $duration); duration = $duration;
                        artwork = $artwork;
                        canToggle = $playback.Controls.IsPlayPauseToggleEnabled;
                        canSeek = $playback.Controls.IsPlaybackPositionEnabled;
                        canNext = $playback.Controls.IsNextEnabled; canPrevious = $playback.Controls.IsPreviousEnabled
                    } }
                }
            } catch {
                Write-Message @{ type = 'state'; data = @{ available = $false; error = $_.Exception.Message } }
            }
        }
        Start-Sleep -Milliseconds 80
    }
} catch {
    Write-Message @{ type = 'state'; data = @{ available = $false; error = $_.Exception.Message } }
    exit 1
}
