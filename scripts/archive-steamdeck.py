from pathlib import Path
import tarfile
import hashlib
import json

root = Path(__file__).resolve().parent.parent
app = root / 'dist/steamdeck/linux-unpacked'
if (app / 'drivedeck').read_bytes()[:4] != b'\x7fELF':
    raise SystemExit('Expected a Linux ELF executable, not a Windows build')
launcher = '''#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$APP_DIR"
exec "$APP_DIR/drivedeck" "$@"
'''
(app / 'AppRun').write_text(launcher, encoding='utf-8', newline='\n')
(app / 'READ ME FIRST.txt').write_text('''DriveDeck — Music sync and Martin preview

1. On the Steam Deck, switch to Desktop Mode.
2. Extract the entire archive into your home folder or Downloads.
3. Open the extracted DriveDeck-SteamDeck folder.
4. Double-click drivedeck (the file without an extension).
   If KDE asks, choose Execute. If needed, right-click drivedeck → Properties
   → Permissions → Is executable, then open it again.

Keep all extracted files together. Node, npm and terminal setup are not needed.
For Gaming Mode, add the extracted drivedeck executable as a non-Steam game.
Leave Proton compatibility OFF: this is a native Linux program.

Use Demo drive first, then install the BeamNG companion using Connect.
When asked, choose the detected Proton folder if BeamNG uses Proton in Steam.
Proton libraries on SD cards are detected using Steam libraryfolders.vdf.
After installing, fully restart BeamNG and enable Other UDP protocols.
The game and DriveDeck must run in the same Linux environment for localhost UDP.
Music must be playing on the Deck. The app uses playerctl or systemd busctl for
MPRIS music and parec or PipeWire pw-cat for the output visualizer, when available.
No SteamOS system modifications, sudo commands or sandbox-disabling flags are used.

Earlier builds have basic Steam Deck telemetry, audio and navigation feedback.
These new decks and tire-pressure integration still need device testing.
Martin is in the deck library. Reinstall the bundled companion for live tire data.
If launch fails, send the error. Do not run the app as root or disable its sandbox.
Automatic Linux updates are not enabled; replace this folder for future versions.
''', encoding='utf-8', newline='\n')
archive = root / 'dist/DriveDeck-SteamDeck-preview-0.20.2-4-x64.tar.gz'
def permissions(info):
    executable = info.isdir() or info.name.endswith(('/drivedeck', '/AppRun', '/chrome-sandbox', '/chrome_crashpad_handler')) or info.name.endswith('.so')
    info.mode = 0o755 if executable else 0o644
    info.uid = info.gid = 0
    info.uname = info.gname = ''
    return info
with tarfile.open(archive, 'w:gz') as output:
    output.add(app, arcname='DriveDeck-SteamDeck', filter=permissions)
with tarfile.open(archive) as check:
    for name in ['drivedeck', 'AppRun', 'resources/app.asar']:
        entry = check.getmember('DriveDeck-SteamDeck/' + name)
        if name != 'resources/app.asar' and not entry.mode & 0o111:
            raise SystemExit('Missing executable mode: ' + name)
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(archive.suffix + '.sha256').write_text(checksum + '  ' + archive.name + '\n')
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'sha256': checksum}))
