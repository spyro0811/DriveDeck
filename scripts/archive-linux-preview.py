from pathlib import Path
import tarfile,hashlib,json
root=Path(__file__).resolve().parent.parent
app=root/'dist/linux-preview/linux-unpacked'
assert (app/'drivedeck').read_bytes()[:4]==b'\x7fELF'
(app/'AppRun').write_text('#!/bin/sh\nset -eu\nAPP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\ncd "$APP_DIR"\nexec "$APP_DIR/drivedeck" "$@"\n',newline='\n')
(app/'READ ME FIRST.txt').write_text('DriveDeck Linux desktop preview\n\nExtract the whole archive. Open the DriveDeck-Linux folder, allow drivedeck to run as a program in Properties / Permissions, then launch it. Keep all extracted files together. Run DriveDeck natively, without Proton. This portable preview updates manually.\n\nPlaid Track adds four display modes: Temp, Clean, We have gone plaid, and Plaid Sensors. Choose it beside Model S in the deck library, then use Display to choose its view. The Civetta display selector is lower so the fullscreen menu does not cover it. Clean now uses a detailed monochrome front-facing drivetrain with component-temperature bars. Plaid fills the entire gauge with moving portal frames and rays. Reinstall the bundled companion and restart BeamNG for brake temperatures; motor temperatures remain blank where unavailable. This is a BeamNG-only preview.\n\nPhone reconnect fix: stopping sharing leaves a connection screen, the phone address is saved, and background requests pause. After first opening this preview, start the phone dashboard, scan its QR code and replace the old Home Screen shortcut once. Keep the desktop app open. The new 26-image vehicle pack is shared by Martin and Model S/Three driving views. Reinstall the bundled companion and restart BeamNG to distinguish Tograc/Vivace and MD-Series bus/truck variants. Martin uses the current vehicle image in its tire-pressure display, fills mobile screens, has a larger center display, and uses a shared SVG coordinate system for the white gauge sweep. Phone pairing shows one QR code with a network-address selector.\n',encoding='utf8')
def permissions(info):
 info.mode=0o755 if info.isdir() or info.name.endswith(('/drivedeck','/AppRun','/chrome-sandbox','/chrome_crashpad_handler','.so')) else 0o644
 info.uid=info.gid=0;info.uname=info.gname='';return info
archive=root/'dist/DriveDeck-Linux-preview-0.20.4-x64.tar.gz'
with tarfile.open(archive,'w:gz') as output:output.add(app,arcname='DriveDeck-Linux',filter=permissions)
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
