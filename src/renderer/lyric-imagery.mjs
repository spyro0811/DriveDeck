const TAU = Math.PI * 2;
const ease = time => 1 - (1 - Math.min(1, time)) ** 3;

function ellipse(ctx, x, y, rx, ry, color, angle = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
  ctx.fill();
}

function symbol(path, color) {
  let shape;
  return ctx => {
    shape ??= new Path2D(path);
    ctx.fillStyle = color;
    ctx.fill(shape);
  };
}

function spark(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * .19, y - size * .19, x + size * .76, y);
  ctx.quadraticCurveTo(x + size * .19, y + size * .19, x, y + size);
  ctx.quadraticCurveTo(x - size * .19, y + size * .19, x - size * .76, y);
  ctx.quadraticCurveTo(x - size * .19, y - size * .19, x, y - size);
  ctx.fill();
}

const droplet = symbol('M0-18 Q15 2 11 9 Q0 23-11 9 Q-15 2 0-18Z', '#8dd5ff');
const flame = symbol('M0-36 Q17-22 15-7 Q27-18 24-25 Q47 23 16 35 Q-7 48-29 26 Q-47 8-19-19 Q-22-2-10 3 Q-18-16 0-36Z', '#ff9663');
const crescent = symbol('M14-41 A47 47 0 1 0 28 40 A44 44 0 0 1 14-41Z', '#efe3ff');
const crown = symbol('M-48-25 L-28-3-17-35 0-8 20-35 29-3 48-25 40 28H-40Z M-39 34 H39 V41 H-39Z', '#ffcf78');
const lips = symbol('M-48 0 Q-21-19-9-15 L0-10 9-15 Q21-19 48 0 Q17 30 0 24 Q-17 30-48 0Z M-35 0 Q0 15 35 0 Q0 5-35 0Z', '#ff729a');
const heart = symbol('M0-18 C-15-45-57-31-47-4 C-43 12-19 26 0 45 C19 26 43 12 47-4 C57-31 15-45 0-18Z', '#ff8fae');
const gem = symbol('M-46-16-29-35H29L46-16 0 44Z', '#95d0ff');
let gemFacets;

export const imageryPainters = {
  tears(ctx, time) {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(60 + i * 36, 27 + (time * 67 + i * 28) % 106);
      ctx.scale(.75 + i * .17, .75 + i * .17);
      droplet(ctx);
      ctx.restore();
    }
  },
  fire(ctx, time) {
    ctx.translate(96, 91);
    ctx.scale(1 + .07 * Math.sin(time * 12), 1.1 + .15 * Math.cos(time * 10));
    flame(ctx);
    ellipse(ctx, -1, 20, 13, 22, '#ffe19d');
    for (let i = 0; i < 7; i++) ellipse(ctx, -36 + i * 12, -8 - (time * 47 + i * 9) % 59, 2, 3, '#ffcc83');
  },
  snow(ctx, time) {
    for (let i = 0; i < 19; i++) {
      const x = 12 + i * 37 % 167 + 7 * Math.sin(time * 2 + i);
      spark(ctx, x, (i * 53 + time * (17 + i % 6)) % 156, 2 + i % 5, '#ddf6ff');
    }
  },
  waves(ctx, time) {
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ['#aaeafa', '#89d5ee', '#569acc', '#446ab4'][i];
      ctx.lineWidth = 5 - i * .6;
      ctx.beginPath();
      for (let x = 12; x <= 180; x += 3) {
        const y = 53 + i * 16 + 11 * Math.sin(x / 22 - time * 4 - i * .7);
        if (x === 12) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  moon(ctx, time) {
    ctx.translate(96, 91 - 24 * ease(time));
    ctx.rotate(-.2);
    crescent(ctx);
    spark(ctx, 52, -30, 6, '#d8ceff');
    spark(ctx, 34, 27, 3, '#b3d5ff');
  },
  stars(ctx, time) {
    for (let i = 0; i < 11; i++) {
      spark(ctx, 15 + i * 61 % 164, 13 + i * 27 % 112, 3 + 3 * (1 + Math.cos(time * 4 + i)), '#ded8ff');
    }
    const x = 174 - time * 64;
    const y = 20 + time * 42;
    ctx.strokeStyle = '#a6b8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 30, y - 20);
    ctx.lineTo(x, y);
    ctx.stroke();
    spark(ctx, x, y, 8, '#fff7de');
  },
  sun(ctx, time) {
    const y = 97 - 34 * ease(time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 192, 105);
    ctx.clip();
    ellipse(ctx, 96, y, 36, 36, '#ffd897');
    for (let i = 0; i < 9; i++) {
      const angle = i * TAU / 9 + time * .2;
      ellipse(ctx, 96 + 48 * Math.cos(angle), y + 48 * Math.sin(angle), 5, 2, '#ffd897', angle);
    }
    ctx.restore();
    ellipse(ctx, 96, 109, 72, 1.5, '#e89f88');
  },
  rose(ctx, time) {
    ctx.translate(96, 66);
    ctx.rotate(-.16);
    ellipse(ctx, 0, 43, 2, 40, '#88bfad');
    ellipse(ctx, -12, 49, 15, 6, '#88bfad', .5);
    const radius = 6 + 21 * ease(time);
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.4;
      ellipse(ctx, Math.cos(angle) * radius * .7, Math.sin(angle) * radius * .7, radius, radius * .54, ['#c44c78', '#e87ba4', '#ffacc0'][i % 3], angle);
    }
  },
  butterfly(ctx, time) {
    ctx.translate(96 + 13 * Math.sin(time * 2), 95 - time * 23);
    const span = 12 + 19 * Math.abs(Math.cos(time * 9));
    for (const direction of [-1, 1]) {
      ellipse(ctx, direction * span * .66, -13, span, 16, '#ba9df8', direction * -.64);
      ellipse(ctx, direction * span * .48, 10, span * .68, 12, '#ff91c2', direction * .45);
    }
    ellipse(ctx, 0, 0, 3, 19, '#eae1ff');
  },
  wings(ctx, time) {
    ctx.translate(96, 86 - 19 * ease(time));
    for (const direction of [-1, 1]) {
      ctx.save();
      ctx.scale(direction, 1);
      ctx.rotate(Math.sin(time * 6) * .22);
      for (let i = 0; i < 6; i++) ellipse(ctx, 13 + i * 7, 9 - i * 7, 20 + i, 5, '#e0e9ff', -.24 - i * .09);
      ctx.restore();
    }
  },
  chains(ctx, time) {
    const gap = 16 * ease(Math.max(0, time - .19));
    for (let i = -3; i <= 3; i++) {
      if (!i && gap > 4) continue;
      ctx.strokeStyle = '#bacfe5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(96 + i * 19 + Math.sign(i) * gap, 77 + i * 7, 15, i % 2 ? 7 : 10, .4, 0, TAU);
      ctx.stroke();
    }
    spark(ctx, 96, 78, Math.min(gap, 11), '#fff1c0');
  },
  glass(ctx, time) {
    for (let i = 0; i < 11; i++) {
      const angle = i * TAU / 11;
      const distance = 17 + (28 + i % 4 * 7) * ease(time);
      ctx.save();
      ctx.translate(96 + distance * Math.cos(angle), 78 + distance * Math.sin(angle));
      ctx.rotate(angle + time * (i % 2 ? -1 : 1));
      ctx.fillStyle = ['#c5eeff', '#7ca6cb', '#ebf3ff'][i % 3];
      ctx.beginPath();
      ctx.moveTo(-9, -6);
      ctx.lineTo(14, -3);
      ctx.lineTo(-4, 11);
      ctx.fill();
      ctx.restore();
    }
  },
  city(ctx, time) {
    for (let i = 0; i < 8; i++) {
      const x = 17 + i * 20;
      const height = (31 + i * 23 % 60) * ease(time + i * .04);
      const y = 125 - height;
      ctx.fillStyle = '#42507f';
      ctx.fillRect(x, y, 16, height);
      ctx.fillStyle = i % 2 ? '#eda5d8' : '#9ad9ff';
      for (let row = y + 8; row < 119; row += 10) ctx.fillRect(x + 4, row, 8, 2);
    }
  },
  clock(ctx, time) {
    ctx.translate(96, 78);
    ctx.strokeStyle = '#a6cbfa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 43, 0, TAU);
    ctx.moveTo(0, 0);
    ctx.lineTo(-13, -18);
    ctx.moveTo(0, 0);
    ctx.lineTo(33 * Math.sin(time * 3), -33 * Math.cos(time * 3));
    ctx.stroke();
  },
  heartbeat(ctx, time) {
    ctx.translate(96, 75);
    const pulse = 1 + .16 * Math.max(0, Math.sin(time * 10)) ** 3;
    ctx.scale(pulse, pulse);
    heart(ctx);
  },
  kiss(ctx, time) {
    ctx.translate(96, 86 - 18 * ease(time));
    ctx.rotate(-.2);
    lips(ctx);
    spark(ctx, 51, -24, 9 * ease(time), '#f9cbe8');
  },
  crown(ctx, time) {
    ctx.translate(96, 102 - 25 * ease(time));
    crown(ctx);
    spark(ctx, 47, -31, 8 * ease(time), '#fff5c9');
  },
  smoke(ctx, time) {
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ['#687391', '#818da8', '#a3aabe', '#c4c9da'][i];
      ctx.beginPath();
      for (let j = 0; j <= 22; j++) {
        const x = 74 + i * 14 + (9 + j * .38) * Math.sin(j * .23 + time * 3 + i * .9);
        const y = 137 - j * 5;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  vinyl(ctx, time) {
    ctx.translate(96, 78);
    ctx.rotate(time * 3.49);
    ellipse(ctx, 0, 0, 51, 51, '#555074');
    for (const radius of [43, 35, 28, 22]) {
      ctx.strokeStyle = '#aca2ce';
      ctx.beginPath();
      ctx.arc(0, 0, radius, .2, TAU - .5);
      ctx.stroke();
    }
    ellipse(ctx, 0, 0, 18, 18, '#f3a3be');
    ellipse(ctx, 0, 0, 3, 3, '#433c66');
  },
  diamonds(ctx, time) {
    ctx.translate(96, 78);
    ctx.rotate(Math.sin(time * 3) * .2);
    gem(ctx);
    ctx.strokeStyle = '#edf8ff';
    ctx.lineWidth = 2;
    gemFacets ??= new Path2D('M-46-16H46 M-29-35-14-16 0 44 14-16 29-35 M-14-16 0-35 14-16');
    ctx.stroke(gemFacets);
    spark(ctx, 43, -37, 6 + 4 * Math.sin(time * 6), '#e4f7ff');
  },
};
