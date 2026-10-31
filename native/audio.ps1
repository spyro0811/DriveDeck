$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
  Add-Type -Path (Join-Path $PSScriptRoot 'audio.cs')
  [DriveDeckAudio.Capture]::Run()
} catch {
  @{error=$_.Exception.Message} | ConvertTo-Json -Compress | Write-Output
  exit 1
}
