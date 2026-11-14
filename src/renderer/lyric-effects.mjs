import { imageryPainters } from './lyric-imagery.mjs';
import { rapPainters } from './lyric-rap-imagery.mjs';
let heartPieces;
let bolt;

function drawHeart(context, time) {
  heartPieces ??= [
    [-1, new Path2D('M96 45 C72 14 29 24 26 60 C23 87 48 108 95 145 L102 118 L84 103 L99 77 L90 64 Z')],
    [1, new Path2D('M96 45 C120 14 163 24 166 60 C169 87 144 108 95 145 L102 118 L84 103 L99 77 L90 64 Z')],
  ];
  const split = Math.min(1, Math.max(0, (time - .14) / .48));
  const separation = 1 - (1 - split) ** 3;
  const gradient = context.createLinearGradient(0, 30, 0, 145);
  gradient.addColorStop(0, '#ffbdcb');
  gradient.addColorStop(.52, '#f06a8b');
  gradient.addColorStop(1, '#9e3d66');
  context.fillStyle = gradient;
  context.shadowColor = '#ff769a';
  context.shadowBlur = 14;
  for (const [direction, piece] of heartPieces) {
    context.save();
    context.translate(96 + direction * separation * 15, 76 + separation * 7);
    context.rotate(direction * separation * .17);
    context.translate(-96, -76);
    context.fill(piece);
    context.restore();
  }
}

function drawRain(context, time) {
  context.lineWidth = 1.6;
  context.lineCap = 'round';
  for (let i = 0; i < 15; i++) {
    const x = 25 + (i * 37) % 147;
    const y = 10 + (i * 29 + time * (55 + i * 3)) % 137;
    context.strokeStyle = i % 3 === 0 ? '#daf1ff' : '#7db6e5';
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x - 6, y + 15 + i % 9);
    context.stroke();
  }
}

function drawLightning(context, time) {
  bolt ??= new Path2D('M108 21 L51 89 H93 L77 141 L145 66 H104 L126 21 Z');
  context.translate(96, 76);
  const scale = .82 + .18 * Math.min(time / .28, 1);
  context.scale(scale, scale);
  context.translate(-96, -76);
  context.fillStyle = '#c5c2ff';
  context.shadowColor = '#aa9bf7';
  context.shadowBlur = 16;
  context.fill(bolt);
}

const painters = { ...imageryPainters, ...rapPainters, heartbreak: drawHeart, rain: drawRain, lightning: drawLightning };

export class LyricEffects {
  constructor(root) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lyric-effect';
    this.canvas.width = 192;
    this.canvas.height = 160;
    this.canvas.hidden = true;
    this.canvas.setAttribute('aria-hidden', 'true');
    root.prepend(this.canvas);
    this.context = this.canvas.getContext('2d');
  }

  update(cue, elapsed, reducedMotion) {
    const frame = Math.floor(elapsed * 30);
    const visible = Boolean(cue && this.context && !reducedMotion && frame >= 0 && frame < 72);
    if (this.canvas.hidden === visible) this.canvas.hidden = !visible;
    if (!visible || (cue === this.cue && frame === this.frame)) return;
    this.cue = cue;
    this.frame = frame;
    const time = frame / 30;
    const context = this.context;
    context.clearRect(0, 0, 192, 160);
    context.save();
    context.globalAlpha = Math.min(1, (time + .04) / .22, (2.4 - time) / .55);
    painters[cue](context, time);
    context.restore();
  }

}
