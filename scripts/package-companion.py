"""Build the optional companion ZIP with BeamNG's required root layout."""
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parent.parent / 'beamng'
with zipfile.ZipFile(root / 'drivedeck-companion.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root / 'drivedeck').rglob('*')):
        # Include directory entries too: BeamNG's virtual filesystem scans this
        # directory directly when discovering custom vehicle protocols.
        archive.write(file, file.relative_to(root / 'drivedeck').as_posix())
print('Built beamng/drivedeck-companion.zip')
