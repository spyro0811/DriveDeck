"""Render DriveDeck's original geometric mark for the Windows executable."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((12, 12, 1012, 1012), radius=220, fill='#11180d', outline='#425532', width=8)
draw.polygon([(176, 742), (482, 224), (622, 224), (316, 742)], fill='#d5f38a')
draw.polygon([(438, 742), (744, 224), (884, 224), (578, 742)], fill='#d5f38a')
image = canvas.resize((256, 256), Image.Resampling.LANCZOS)
(root / 'build').mkdir(exist_ok=True)
(root / 'src/renderer/assets').mkdir(exist_ok=True)
image.save(root / 'build/icon.ico', sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])
image.save(root / 'src/renderer/assets/icon.png')
print('Rendered original DriveDeck icon.')
