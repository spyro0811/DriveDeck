@echo off
setlocal
cd /d "%~dp0"
if exist "dist\win-unpacked\DriveDeck.exe" (
  start "" "dist\win-unpacked\DriveDeck.exe"
  exit /b
)
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
  exit /b
)
echo Run npm install in this folder first, or use the portable executable in dist.
pause
