function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function circle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function shape(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export const rapPainters = {
  road(ctx, time) {
    shape(ctx, [[0, 85], [45, 55], [77, 74], [127, 46], [192, 81], [192, 160], [0, 160]], '#374c64');
    shape(ctx, [[83, 77], [109, 77], [172, 155], [20, 155]], '#182636');
    line(ctx, [[83, 77], [20, 155]], '#8b9dbb');
    line(ctx, [[109, 77], [172, 155]], '#8b9dbb');
    for (let i = 0; i < 5; i++) {
      const depth = ((time * .64 + i * .2) % 1) ** 2;
      const y = 79 + depth * 65;
      line(ctx, [[96, y], [96, y + 2 + depth * 8]], '#e5bf79', 1 + depth * 3);
    }
  },
  night(ctx, time) {
    circle(ctx, 112, 64 - Math.min(time, 2) * 6, 25, '#dfddf5');
    for (const [x, y] of [[40, 34], [57, 67], [77, 21], [148, 43], [157, 71]]) {
      circle(ctx, x, y, 1.4 + .55 * Math.sin(time * 2 + x), '#bdbaf0');
    }
    shape(ctx, [[0, 126], [35, 103], [63, 112], [92, 90], [130, 107], [154, 92], [192, 117], [192, 150], [0, 150]], '#232845');
  },
  phone(ctx, time) {
    ctx.translate(96, 81);
    ctx.rotate(Math.sin(time * 13) * .09);
    ctx.beginPath();
    ctx.roundRect(-25, -46, 50, 92, 9);
    ctx.fillStyle = '#92acca';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-21, -41, 42, 82, 6);
    ctx.fillStyle = '#253950';
    ctx.fill();
    circle(ctx, 0, 3, 13, '#6ad2a1');
    line(ctx, [[-7, -2], [-4, 5], [3, 10], [8, 6]], '#ecfff8', 3);
    const wave = (time % .8) * 15;
    for (const side of [-1, 1]) {
      const x = side * (32 + wave);
      line(ctx, [[x - side * 4, -13], [x, -5], [x, 5], [x - side * 4, 13]], '#9de5fb', 2);
    }
  },
  door(ctx, time) {
    const opening = 1 - Math.min(1, time * 1.5);
    ctx.fillStyle = '#47516e';
    ctx.fillRect(56, 23, 82, 111);
    ctx.fillStyle = '#dfaf69';
    ctx.fillRect(62, 28, 70, 103);
    const edge = 131 - opening * 49;
    shape(ctx, [[62, 28], [edge, 30 + opening * 20], [edge, 130 - opening * 10], [62, 131]], '#8b6657');
    circle(ctx, edge - 5, 81, 3, '#f4c882');
    line(ctx, [[51, 135], [145, 135]], '#8e92a6', 2);
  },
  plane(ctx, time) {
    ctx.translate(55 + Math.min(1, time * .64) * 72, 103 - Math.min(1, time * .64) * 51);
    ctx.rotate(-.4);
    line(ctx, [[-65, 4], [-34, 4]], '#b3d7ef80', 2);
    shape(ctx, [[-33, 1], [-42, -14], [-33, -14], [-23, -5], [-5, -5], [-17, -26], [-8, -26], [12, -5], [39, -5], [48, 1], [40, 8], [12, 8], [-5, 24], [-14, 24], [-5, 8], [-28, 8]], '#c4d9ee');
    for (let x = 18; x <= 36; x += 6) circle(ctx, x, 1, 1.6, '#4d6b8e');
  },
  cash(ctx, time) {
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.translate(31 + (i * 37) % 131, (i * 31 + time * 68) % 174 - 7);
      ctx.rotate(Math.sin(time * 4 + i) * .55);
      ctx.fillStyle = '#82d6a0';
      ctx.fillRect(-23, -11, 46, 22);
      ctx.strokeStyle = '#48775d';
      ctx.strokeRect(-20, -8, 40, 16);
      circle(ctx, 0, 0, 7, '#48775d');
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c8fbe0';
      ctx.fillText('$', 0, 4);
      ctx.restore();
    }
  },
  death(ctx, time) {
    const flicker = Math.sin(time * 9);
    circle(ctx, 96, 57, 29 + flicker, '#755c5455');
    ctx.fillStyle = '#d0bda7';
    ctx.fillRect(84, 86, 24, 42);
    ctx.fillStyle = '#b38c77';
    ctx.fillRect(79, 128, 34, 4);
    line(ctx, [[96, 88], [96, 75]], '#716362', 2);
    shape(ctx, [[96, 35 + flicker * 4], [105, 61], [102, 72], [96, 76], [89, 71], [87, 63]], '#ffc48b');
    circle(ctx, 96, 67, 4, '#ffe8b4');
    const ember = (time * 22) % 29;
    circle(ctx, 96 + Math.sin(time * 3) * 7, 35 - ember, 1.7, '#eabb8e');
  },
  siren(ctx, time) {
    // A slow, local sweep keeps the animation away from a strobe.
    const sweep = Math.sin(time * 2.3) * 35;
    shape(ctx, [[73, 74], [17 + sweep, 26], [9 + sweep, 105]], '#ff718c65');
    shape(ctx, [[119, 74], [175 - sweep, 26], [183 - sweep, 105]], '#7bb7ff65');
    line(ctx, [[49, 89], [143, 89]], '#788aa8', 8);
    line(ctx, [[58, 77], [89, 77]], '#fa8297', 14);
    line(ctx, [[103, 77], [134, 77]], '#89bfff', 14);
  },
  shots(ctx, time) {
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.39996;
      const distance = 9 + Math.min(time, 1.5) * (29 + i % 5 * 9);
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      line(ctx, [[96 + x * distance, 78 + y * distance], [96 + x * (distance + 8), 78 + y * (distance + 8)]], '#f2b988', 2);
    }
  },
  whip(ctx, time) {
    for (let i = 0; i < 5; i++) {
      const x = 155 - (time * 125 + i * 31) % 157;
      line(ctx, [[x, 70 + i * 13], [x + 22, 70 + i * 13]], '#88bbec77');
    }
    const x = 18 + Math.min(time / 1.2, 1) * 35;
    ctx.translate(x, 10);
    shape(ctx, [[0, 90], [9, 73], [26, 68], [43, 52], [77, 52], [99, 71], [126, 79], [129, 94], [7, 94]], '#789bc5');
    shape(ctx, [[33, 68], [47, 56], [73, 56], [87, 68]], '#293952');
    line(ctx, [[116, 80], [125, 82]], '#f0e7c3', 3);
    for (const wheel of [27, 105]) {
      circle(ctx, wheel, 93, 12, '#1d283b');
      circle(ctx, wheel, 93, 6, '#bac9e4');
      const angle = time * 19;
      line(ctx, [[wheel - Math.cos(angle) * 5, 93 - Math.sin(angle) * 5], [wheel + Math.cos(angle) * 5, 93 + Math.sin(angle) * 5]], '#596985');
    }
  },
  ice(ctx, time) {
    ctx.save();
    ctx.translate(96, 77);
    ctx.rotate(Math.sin(time * 3) * .19);
    line(ctx, [[0, -49], [0, 47]], '#eab679', 23);
    circle(ctx, 0, 0, 35, '#b6efff');
    circle(ctx, 0, 0, 27, '#4b738e');
    line(ctx, [[-10, -9], [0, 0], [12, -17]], '#fff4d8', 3);
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      circle(ctx, Math.cos(angle) * 31, Math.sin(angle) * 31, 1.5 + (1 + Math.sin(time * 6 + i)), '#f1faff');
    }
    ctx.restore();
  },
  mic(ctx, time) {
    ctx.translate(96, 78);
    ctx.rotate(-.55 + Math.sin(time * 6) * .07);
    line(ctx, [[0, -12], [0, 43]], '#a18dc4', 13);
    circle(ctx, 0, -27, 19, '#d3bef2');
    for (const y of [-37, -31, -25, -19]) line(ctx, [[-12, y], [12, y]], '#8972ab', 2);
    for (let i = 0; i < 6; i++) {
      const height = 5 + 15 * Math.abs(Math.sin(time * 7 + i));
      line(ctx, [[-53 + i * 21, 62 - height], [-53 + i * 21, 62]], '#b690e7', 4);
    }
  },
  jail(ctx, time) {
    const travel = 41 * Math.max(0, 1 - time * 1.7) ** 2;
    ctx.translate(travel, 0);
    for (let x = 40; x <= 152; x += 28) line(ctx, [[x, 25], [x, 135]], '#8f9ab7', 8);
    for (const y of [39, 121]) line(ctx, [[32, y], [160, y]], '#59657e', 7);
    circle(ctx, 119, 81, 8, '#b5a88d');
    line(ctx, [[119, 81], [119, 87]], '#514c50', 3);
  },
  toast(ctx, time) {
    const tilt = .32 * Math.sin(Math.min(time * 3, Math.PI));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(96 + side * 29, 83);
      ctx.rotate(side * (.24 + tilt));
      shape(ctx, [[-13, -29], [13, -29], [9, 3], [0, 13], [-9, 3]], '#f6ce8d');
      line(ctx, [[0, 12], [0, 36]], '#e3c197', 2);
      line(ctx, [[-9, 36], [9, 36]], '#e3c197', 2);
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) circle(ctx, 74 + i * 11, 48 - (i * 7 + time * 24) % 35, 2, '#fff0b9');
  },
  dice(ctx, time) {
    const travel = Math.min(time, 1);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(96 + side * (17 + travel * 17), 81 - Math.sin(travel * Math.PI) * 29);
      ctx.rotate(side * (.27 + travel * Math.PI * 2));
      ctx.fillStyle = side < 0 ? '#e0d8ee' : '#f0cbd9';
      ctx.beginPath();
      ctx.roundRect(-21, -21, 42, 42, 7);
      ctx.fill();
      for (const [x, y] of [[-10, -10], [0, 0], [10, 10], ...(side < 0 ? [[-10, 10], [10, -10]] : [])]) {
        circle(ctx, x, y, 3.4, '#625674');
      }
      ctx.restore();
    }
  },
  hustle(ctx, time) {
    for (let i = 0; i < 5; i++) {
      const x = 33 + i * 26;
      const height = (18 + 13 * i) * Math.min(1, Math.max(.08, (time - i * .11) * 3));
      ctx.fillStyle = '#79c3a0';
      ctx.fillRect(x, 124 - height, 19, height);
    }
    const x = 38 + Math.min(time, 1) * 111;
    const y = 97 - Math.min(time, 1) * 54;
    line(ctx, [[34, 110], [x, y], [x - 14, y + 2]], '#d5f1c6', 3);
  },
  stage(ctx, time) {
    const sweep = Math.sin(time * 2) * 39;
    shape(ctx, [[32, 17], [65 + sweep, 113], [153 + sweep, 113]], '#ecd5ff55');
    shape(ctx, [[160, 17], [40 - sweep, 113], [129 - sweep, 113]], '#8ec7ff55');
    line(ctx, [[29, 117], [161, 117]], '#a89ac8', 4);
    for (let i = 0; i < 8; i++) circle(ctx, 33 + i * 18, 117, 2, '#eee0ff');
  },
};
