// Small, original Canvas sprites. Every exported helper leaves the caller's state intact.
const INK = '#142731';
const TAU = Math.PI * 2;

function oval(ctx, x, y, rx, ry, fill, stroke, width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function rounded(ctx, x, y, w, h, radius, fill, stroke, width = 2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function strokeLine(ctx, points, color, width = 2) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}

function fillPath(ctx, fill, stroke = null, width = 2) {
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

/** Face center is (x,y); close-cropped hair follows the video rider's silhouette. */
export function drawHead(ctx, x, y, { expression = 'calm', rotation = 0, box = false } = {}) {
  if (box) { drawBoxHead(ctx, x, y, rotation); return; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  oval(ctx, 1, -6, 26, 25, '#18232b', INK, 2.3);
  oval(ctx, 24, 4, 5, 8, '#edb694', '#a96e59', 1.3);
  oval(ctx, -25, 4, 4, 7, '#edb694');
  ctx.beginPath(); ctx.moveTo(-24, -13);
  ctx.bezierCurveTo(-27, -2, -24, 15, -14, 22);
  ctx.quadraticCurveTo(-2, 29, 10, 23);
  ctx.bezierCurveTo(24, 16, 24, 0, 20, -15);
  ctx.quadraticCurveTo(-1, -26, -24, -13); ctx.closePath();
  fillPath(ctx, '#f1c2a1', INK, 2.2);
  // A compact crown, straight short fringe and tapered temples read as a buzz cut.
  ctx.beginPath(); ctx.moveTo(-25, -1);
  ctx.bezierCurveTo(-29, -18, -21, -29, -11, -31);
  ctx.quadraticCurveTo(-1, -33, 10, -30);
  ctx.bezierCurveTo(22, -27, 27, -17, 25, -4);
  ctx.lineTo(22, 3); ctx.lineTo(19, -13); ctx.lineTo(15, -17);
  ctx.quadraticCurveTo(1, -20, -13, -18);
  ctx.lineTo(-20, -14); ctx.lineTo(-22, 1); ctx.closePath(); fillPath(ctx, '#1b252d', INK, 1.8);
  for (const [hx, hy] of [[-16,-24],[-9,-27],[-2,-25],[6,-26],[14,-23],[-20,-19],[19,-18],[-11,-21],[1,-22],[11,-20]]) {
    strokeLine(ctx, [[hx, hy], [hx + .2, hy - 1.1]], '#3b444a', .8);
  }
  const shocked = expression === 'shock';
  if (shocked) {
    strokeLine(ctx, [[-20, -6], [-12, -10]], '#292a2a', 2);
    strokeLine(ctx, [[0, -10], [7, -6]], '#292a2a', 2);
  } else {
    strokeLine(ctx, [[-20, -7], [-12, -8]], '#3a302c', 1.9);
    strokeLine(ctx, [[0, -8], [7, -7]], '#3a302c', 1.9);
  }
  // Thin, dark glasses rather than a helmet visor.
  rounded(ctx, -23, -3, 17, 12, 4.5, '#fff5df25', '#263039', 1.9);
  rounded(ctx, -2, -3, 16, 12, 4.5, '#fff5df25', '#263039', 1.9);
  strokeLine(ctx, [[-6, 1], [-2, 1]], '#263039', 1.8);
  strokeLine(ctx, [[14, 1], [23, -1]], '#263039', 1.9);
  oval(ctx, -15, 2, 2.1, shocked ? 3.4 : 2.7, '#243238');
  oval(ctx, 5, 2, 2.1, shocked ? 3.4 : 2.7, '#243238');
  oval(ctx, -16, 1, .7, .8, '#fff'); oval(ctx, 4, 1, .7, .8, '#fff');
  oval(ctx, -20, 13, 4.3, 2.4, '#e69a8a65');
  oval(ctx, 12, 13, 4.3, 2.4, '#e69a8a65');
  strokeLine(ctx, [[-5, 5], [-7, 10], [-3, 10]], '#c58a6e', 1.3);
  if (shocked) oval(ctx, -5, 18, 4, 4.8, '#92584e');
  else {
    ctx.beginPath(); ctx.moveTo(-11, 17); ctx.quadraticCurveTo(-4, 21, 3, 16);
    ctx.strokeStyle = '#a86358'; ctx.lineWidth = 1.9; ctx.stroke();
  }
  ctx.restore();
}

/** The flying mask is a small carton, with the face centered at (x,y). */
export function drawBoxHead(ctx, x, y, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Bounds are exactly 60 by 65: -30..30, -35..30.
  ctx.beginPath(); ctx.moveTo(-29, -22); ctx.lineTo(-10, -34);
  ctx.lineTo(29, -26); ctx.lineTo(10, -12); ctx.closePath();
  fillPath(ctx, '#ffbc83', '#43383f', 2.1);
  ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(29, -26);
  ctx.lineTo(29, 16); ctx.lineTo(10, 29); ctx.closePath();
  fillPath(ctx, '#ff714f', '#43383f', 2.1);
  ctx.beginPath(); ctx.moveTo(-29, -22); ctx.lineTo(10, -12);
  ctx.lineTo(10, 29); ctx.lineTo(-29, 20); ctx.closePath();
  fillPath(ctx, '#fffaf0', '#43383f', 2.1);
  strokeLine(ctx, [[-8, -28], [-15, -18]], '#68505a', 1.9);
  rounded(ctx, -23, -8, 8, 14, 4, '#ffda54', '#43383f', 2.4);
  rounded(ctx, -6, -3, 8, 14, 4, '#ffda54', '#43383f', 2.4);
  ctx.beginPath(); ctx.moveTo(-14, 13); ctx.quadraticCurveTo(-10, 16, -6, 14);
  ctx.strokeStyle = '#d1b7a4'; ctx.lineWidth = 1.7; ctx.stroke();
  ctx.restore();
}

/** Shared black-and-white football for pickups, the rider and fired shots. */
export function drawFootball(ctx, x, y, r = 21.5, spin = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.scale(r / 21.5, r / 21.5);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const ballFill = ctx.createRadialGradient(-7, -8, 2, 2, 3, 24);
  ballFill.addColorStop(0, '#ffffff'); ballFill.addColorStop(1, '#dce5e3');
  oval(ctx, 0, 0, 21.5, 21.5, ballFill);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, 21.5, 21.5, 0, 0, TAU); ctx.clip();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 - Math.PI / 2;
    const px = Math.cos(a) * 8.4, py = Math.sin(a) * 8.4;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); fillPath(ctx, '#24333b');
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 - Math.PI / 2;
    ctx.save(); ctx.rotate(a);
    strokeLine(ctx, [[8.4, 0], [14.5, 0]], '#819491', 1.1);
    ctx.beginPath(); ctx.moveTo(14.5, 0); ctx.lineTo(18.5, -5.8);
    ctx.lineTo(25, -5); ctx.lineTo(25, 5); ctx.lineTo(18.5, 5.8); ctx.closePath();
    fillPath(ctx, '#24333b');
    ctx.beginPath(); ctx.moveTo(18.5, 5.8); ctx.quadraticCurveTo(14, 12, 11.1, 18.4);
    ctx.strokeStyle = '#97aaa5'; ctx.lineWidth = .8; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  oval(ctx, 0, 0, 21.5, 21.5, null, '#2b4249', 1.7);
  ctx.restore();
}

/** Cyan planet and dark orbit redrawn from the Xiaoyuzhou app icon. */
export function drawXiaoyuzhou(ctx, x, y, r = 25, tilt = -.64) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 25, r / 25);
  const ring = (start, end) => {
    ctx.save(); ctx.rotate(tilt);
    ctx.beginPath(); ctx.ellipse(0, 0, 35, 10.5, 0, start, end);
    ctx.strokeStyle = '#080e13'; ctx.lineWidth = 4.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -1, 35, 10.5, 0, start, end);
    ctx.strokeStyle = '#718b91'; ctx.lineWidth = .65; ctx.stroke(); ctx.restore();
  };
  ring(Math.PI, TAU);
  const planet = ctx.createLinearGradient(-10, -24, 10, 24);
  planet.addColorStop(0, '#20b9d8'); planet.addColorStop(.48, '#50bdd2'); planet.addColorStop(1, '#bedfd8');
  oval(ctx, 0, 0, 24, 24, planet, '#8ed8df', 1.2);
  ctx.beginPath(); ctx.ellipse(0, 0, 22.5, 22.5, 0, Math.PI * 1.08, Math.PI * 1.78);
  ctx.strokeStyle = '#c0f4ef'; ctx.lineWidth = 1; ctx.stroke();
  ring(0, Math.PI);
  ctx.restore();
}

/** Original game objects inspired by each app's subject and color, never logo tiles. */
export function drawAppPickup(ctx, type, x, y, r = 25, t = 0, { countdown = false } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 25, r / 25);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (type === 'shengchen') {
    // Slim dark rim, clean white dial and red second hand, like the reference clock.
    oval(ctx, 1, 2, 24, 24, '#0b182233');
    const face = ctx.createRadialGradient(-8, -10, 2, 0, 0, 23);
    face.addColorStop(0, '#ffffff'); face.addColorStop(1, '#edede8');
    oval(ctx, 0, 0, 23, 23, face, '#4b4c49', 2.2);
    oval(ctx, 0, 0, 21.1, 21.1, null, '#c9cbc5', .7);
    const hand = (angle, length, color, width, tail = 0) => {
      ctx.save(); ctx.rotate(angle);
      strokeLine(ctx, [[0, tail], [0, -length]], color, width);
      ctx.restore();
    };
    hand(.48, 9, '#262a2a', 1.2);
    hand(Math.PI, 14, '#464945', .85);
    hand(-2.42 + t * .9, 17, '#df6d61', .7, 4);
    oval(ctx, 0, 0, 1.2, 1.2, '#df6d61');
  } else if (type === 'xiaoyuzhou') {
    drawXiaoyuzhou(ctx, 0, 0, 23, -.64 + Math.sin(t * 2) * .025);
  } else if (type === 'high') {
    // A little lift potion in a blue glass jar, with a bright cap and rising bubbles.
    const glass = ctx.createLinearGradient(-14, 0, 14, 0);
    glass.addColorStop(0, '#8ee1e5'); glass.addColorStop(.55, '#4aabc8'); glass.addColorStop(1, '#438aa9');
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-16, -8, -15, 1);
    ctx.lineTo(-14, 15); ctx.quadraticCurveTo(-13, 21, 0, 21);
    ctx.quadraticCurveTo(13, 21, 14, 15); ctx.lineTo(15, 1);
    ctx.quadraticCurveTo(16, -8, 10, -12); ctx.closePath(); fillPath(ctx, glass, INK, 2);
    oval(ctx, 0, 8, 11.5, 5.5, '#b7e9db88');
    rounded(ctx, -12, -18, 24, 8, 3, '#f3d697', '#4a6b70', 1.8);
    oval(ctx, 0, -17, 9.5, 2, '#fff1c3');
    strokeLine(ctx, [[-10, -5], [-10, 9]], '#d7fff2', 2.1);
    strokeLine(ctx, [[-5, 5], [0, 0], [5, 5]], '#fff5cf', 2.7);
    strokeLine(ctx, [[0, 1], [0, 13]], '#fff5cf', 2.7);
    const drift = Math.sin(t * 2.7) * 1.3;
    oval(ctx, -17, -21 + drift, 2.2, 2.2, '#a8e5e2');
    oval(ctx, 16, -14 - drift, 1.5, 1.5, '#c8f5e4');
    strokeLine(ctx, [[-20, 10], [-20, 3]], '#8ac7c9', 1.4);
    strokeLine(ctx, [[20, 12], [20, 5]], '#8ac7c9', 1.4);
  } else if (type === 'double') {
    // An orange with a smaller airborne echo and two separate jump arcs.
    ctx.save(); ctx.globalAlpha *= .58;
    oval(ctx, 12, -11, 9.5, 10, '#ffbd6d', '#be7749', 1.5);
    strokeLine(ctx, [[14, -19], [18, -23]], '#88b390', 2.5); ctx.restore();
    const orange = ctx.createRadialGradient(-10, -1, 2, -4, 7, 17);
    orange.addColorStop(0, '#ffce78'); orange.addColorStop(1, '#f18b4d');
    oval(ctx, -5, 6, 15, 15.8, orange, '#a96e45', 1.8);
    ctx.beginPath(); ctx.moveTo(-5, -10); ctx.quadraticCurveTo(-9, -22, -18, -19);
    ctx.quadraticCurveTo(-18, -11, -5, -10); ctx.closePath(); fillPath(ctx, '#9ec19a', '#5f8a78', 1.2);
    strokeLine(ctx, [[-5, -8], [-3, -13]], '#6d7961', 1.7);
    ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(-16, -2, -10, -5);
    ctx.strokeStyle = '#ffe4aa'; ctx.lineWidth = 2.3; ctx.stroke();
    for (const [px,py] of [[-1,10],[-7,13],[2,5]]) oval(ctx, px, py, .8, .8, '#d87949');
    ctx.beginPath(); ctx.moveTo(-24, 11); ctx.quadraticCurveTo(-30, 1, -23, -6);
    ctx.strokeStyle = '#f8d58a'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 13); ctx.quadraticCurveTo(26, 5, 23, -4);
    ctx.strokeStyle = '#f8d58a'; ctx.lineWidth = 1.8; ctx.stroke();
  } else if (type === 'flight' && countdown) {
    ctx.beginPath(); ctx.moveTo(-12, 3); ctx.quadraticCurveTo(-24, -2, -27, 5);
    ctx.quadraticCurveTo(-22, 17, -12, 12); ctx.closePath(); fillPath(ctx, '#c8e7df', '#6eaaa8', 1.3);
    ctx.beginPath(); ctx.moveTo(13, 4); ctx.quadraticCurveTo(24, -3, 28, 3);
    ctx.quadraticCurveTo(24, 15, 13, 12); ctx.closePath(); fillPath(ctx, '#c8e7df', '#6eaaa8', 1.3);
    ctx.save(); ctx.scale(.58, .58); drawBoxHead(ctx, 0, -1, -.07); ctx.restore();
    strokeLine(ctx, [[-8, 24], [-6, 20]], '#b8ddd7', 1.5);
    strokeLine(ctx, [[4, 26], [6, 21]], '#b8ddd7', 1.5);
  } else if (type === 'reminder' && countdown) {
    oval(ctx, 0, -19, 3.4, 4.5, '#f5d785', '#a67c46', 1.3);
    ctx.beginPath(); ctx.moveTo(-12, -7); ctx.quadraticCurveTo(-11, -18, 0, -18);
    ctx.quadraticCurveTo(11, -18, 12, -7); ctx.lineTo(14, 6); ctx.lineTo(18, 11);
    ctx.quadraticCurveTo(0, 18, -18, 11); ctx.lineTo(-14, 6); ctx.closePath();
    const bell = ctx.createLinearGradient(-10, 0, 12, 6);
    bell.addColorStop(0, '#ffe7a1'); bell.addColorStop(1, '#edb84f'); fillPath(ctx, bell, '#9c783f', 1.8);
    oval(ctx, 0, 16, 4.1, 3.5, '#f5d785', '#a67c46', 1.2);
    strokeLine(ctx, [[-7, -6], [-7, 3]], '#fff5cd', 2.1);
    strokeLine(ctx, [[-22, -12], [-25, -16]], '#f4d475', 2);
    strokeLine(ctx, [[21, -13], [24, -17]], '#f4d475', 2);
    oval(ctx, 18, 17, 6.7, 6.7, '#d2e9de', '#537b77', 1.4);
    oval(ctx, 18, 17, 2.2, 2.2, '#4c7772');
  } else if (type === 'flight') {
    // The reference box has two slim cream arms with a dark rounded outline.
    // Draw the far arm behind the box and the near arm over its orange side.
    ctx.beginPath(); ctx.moveTo(-15, -5);
    ctx.bezierCurveTo(-18, -1, -23, 8, -23, 13);
    ctx.bezierCurveTo(-23, 18, -18, 18, -16, 13);
    ctx.lineTo(-11, 0); ctx.closePath(); fillPath(ctx, '#ffe6bd', '#43383f', 2.6);
    ctx.save(); ctx.scale(.58, .58); drawBoxHead(ctx, 0, -1, -.07); ctx.restore();
    ctx.beginPath(); ctx.moveTo(13, -3);
    ctx.bezierCurveTo(10, -7, 6, -4, 9, 0);
    ctx.bezierCurveTo(14, 6, 17, 12, 19, 16);
    ctx.bezierCurveTo(22, 20, 27, 17, 25, 12);
    ctx.bezierCurveTo(22, 6, 18, 1, 13, -3);
    ctx.closePath(); fillPath(ctx, '#ffe6bd', '#43383f', 2.6);
  } else if (type === 'reminder') {
    // A white pointing hand taps a warm yellow menu card.
    rounded(ctx, -22, -24, 36, 44, 6, '#ffd460', '#9c783f', 2);
    rounded(ctx, -17, -19, 26, 32, 3, '#fff7d9');
    strokeLine(ctx, [[-11, -12], [3, -12]], '#d9a63d', 2);
    strokeLine(ctx, [[-11, -5], [1, -5]], '#d9a63d', 2);
    strokeLine(ctx, [[-11, 2], [-4, 2]], '#d9a63d', 2);
    ctx.save(); ctx.setLineDash([2, 3]);
    oval(ctx, -4, -5, 9, 9, null, '#735d38', 1.6); ctx.restore();
    ctx.beginPath(); ctx.moveTo(1, 22); ctx.lineTo(-9, 10);
    ctx.bezierCurveTo(-13, 5, -8, 1, -5, 4); ctx.lineTo(0, 9);
    ctx.lineTo(-8, -7); ctx.bezierCurveTo(-11, -13, -5, -16, -2, -10);
    ctx.lineTo(4, 1); ctx.bezierCurveTo(3, -5, 9, -6, 11, 0);
    ctx.bezierCurveTo(11, -5, 17, -4, 18, 2);
    ctx.bezierCurveTo(20, -2, 25, 0, 25, 5);
    ctx.lineTo(25, 12); ctx.quadraticCurveTo(24, 20, 18, 25);
    ctx.closePath(); fillPath(ctx, '#fffefa', '#1b252d', 2.8);
  } else if (type === 'football') {
    drawFootball(ctx, 0, 0, 21.5, -.12 + Math.sin(t * 2) * .035);
  }
  ctx.restore();
}

function petEye(ctx, x, y, size, tint = '#263745') {
  oval(ctx, x, y, size + 1.2, size + 1.5, '#fff8eb');
  oval(ctx, x + .6, y + .4, size - .2, size + .2, tint);
  oval(ctx, x - 1.4, y - 1.9, size * .34, size * .37, '#fff');
  oval(ctx, x + 2, y + 2.5, size * .14, size * .15, '#fff8e3');
}

function petMouth(ctx, eating, t, otter) {
  // Shared suction target in unscaled pet coordinates is exactly (12,-28).
  if (eating) {
    oval(ctx, 12, -28, 6.5 + Math.sin(t * 12) * .25, 6.1, '#544052', '#654451', 1.2);
    oval(ctx, 12.5, -25.3, 3.6, 1.8, '#f8a9b3');
  } else {
    ctx.beginPath(); ctx.moveTo(5, -30); ctx.quadraticCurveTo(8, -25, 11, -29);
    ctx.quadraticCurveTo(13, -24.5, 17, -29);
    ctx.strokeStyle = otter ? '#806dc1' : '#976556'; ctx.lineWidth = 1.7; ctx.stroke();
  }
}

/** Sitting pet: (x,y) is foot baseline, 76 px tall. Mouth target: (+12,-28). */
export function drawPet(ctx, type, x, y, { scale = 1, t = 0, eating = false, headOnly = false } = {}) {
  const otter = type === 'otter' || type === 'otterlife';
  const orange = type === 'guoguo';
  const base = otter ? '#f8f6ff' : orange ? '#f4b454' : '#35404b';
  const light = otter ? '#fffdf6' : '#fff4d9';
  const lineColor = otter ? '#aaa0df' : orange ? '#b77c3e' : '#23313d';
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!headOnly) {
    if (otter) {
      // Short tail, lavender fins and tiny round ears from the otter icon.
      ctx.beginPath(); ctx.moveTo(-10, -4); ctx.bezierCurveTo(-38, 1, -42, -10, -31, -17);
      ctx.quadraticCurveTo(-24, -19, -18, -12); ctx.closePath(); fillPath(ctx, '#c6bdff', lineColor, 1.8);
    } else {
      ctx.beginPath(); ctx.moveTo(-20, -9); ctx.bezierCurveTo(-39, -11, -39, -31, -31, -31);
      ctx.bezierCurveTo(-25, -31, -32, -20, -24, -20);
      ctx.strokeStyle = lineColor; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = 6.8; ctx.stroke();
      if (!orange) oval(ctx, -31, -30, 3.6, 3.8, light);
    }
    oval(ctx, 0, -19, 22, 21, base, lineColor, 1.8);
    oval(ctx, 3, -16, 12.4, 16.5, light);
  }
  if (otter) {
    if (!headOnly) {
      oval(ctx, -16, -18, 8, 14, '#aca0fb', '#8e83d7', 1.4);
      oval(ctx, 18, -18, 8, 14, '#aca0fb', '#8e83d7', 1.4);
      oval(ctx, -12, -3.5, 10, 4, '#b7aafa', lineColor, 1.2);
      oval(ctx, 13, -3.5, 10, 4, '#b7aafa', lineColor, 1.2);
    }
    oval(ctx, -23, -63, 9, 10, '#b6a9fa', lineColor, 1.6);
    oval(ctx, 24, -63, 9, 10, '#b6a9fa', lineColor, 1.6);
    oval(ctx, -23, -63, 4, 4.7, '#ddd5ff');
    oval(ctx, 24, -63, 4, 4.7, '#ddd5ff');
  } else {
    if (!headOnly) {
      rounded(ctx, -20, -7, 18, 8, 4, orange ? '#f6c477' : light, lineColor, 1.5);
      rounded(ctx, 4, -7, 18, 8, 4, orange ? '#f6c477' : light, lineColor, 1.5);
    }
    ctx.beginPath(); ctx.moveTo(-27, -48); ctx.quadraticCurveTo(-31, -62, -25, -74);
    ctx.quadraticCurveTo(-14, -73, -8, -62); ctx.lineTo(11, -62);
    ctx.quadraticCurveTo(19, -74, 27, -73); ctx.quadraticCurveTo(32, -61, 28, -46);
    ctx.closePath(); fillPath(ctx, base, lineColor, 1.8);
    ctx.beginPath(); ctx.moveTo(-25, -64); ctx.lineTo(-23, -69); ctx.lineTo(-14, -62); ctx.closePath(); fillPath(ctx, '#f0a7a4');
    ctx.beginPath(); ctx.moveTo(18, -62); ctx.lineTo(25, -69); ctx.lineTo(27, -62); ctx.closePath(); fillPath(ctx, '#f0a7a4');
  }
  oval(ctx, 1, -44, otter ? 31 : 30, otter ? 27 : 26, base, lineColor, 1.8);
  if (otter) {
    // The pale face and large indigo nose are the icon's recognizable features.
    oval(ctx, 2, -42, 28.5, 24.5, '#fffdf7');
    oval(ctx, -12, -46, 2.2, 3.5, '#5046ba');
    oval(ctx, 20, -46, 2.2, 3.5, '#5046ba');
    oval(ctx, 10, -36.8, 11, 8.7, '#35305f', '#6f65a7', 1.1);
    oval(ctx, 7, -40, 3.4, 1.5, '#66618f');
    oval(ctx, -17, -32, 5, 2.8, '#f1c5d9'); oval(ctx, 24, -32, 4.5, 2.8, '#f1c5d9');
  } else {
    if (!orange) {
      // White blaze narrows between the eyes; dark eye patches remain distinct.
      ctx.beginPath(); ctx.moveTo(2, -68); ctx.quadraticCurveTo(-1, -50, -17, -30);
      ctx.quadraticCurveTo(0, -17, 24, -28); ctx.quadraticCurveTo(11, -44, 2, -68);
      ctx.closePath(); fillPath(ctx, light);
      petEye(ctx, -11, -45, 7.1, '#34434b'); petEye(ctx, 17, -45, 7.1, '#34434b');
    } else {
      // Rounded tiger stripes and cream muzzle keep Guoguo identifiable.
      strokeLine(ctx, [[-8, -65], [-5, -57]], '#cc8237', 3.1);
      strokeLine(ctx, [[2, -67], [3, -57]], '#cc8237', 3.4);
      strokeLine(ctx, [[12, -64], [10, -56]], '#cc8237', 3.1);
      strokeLine(ctx, [[-27, -41], [-22, -38]], '#cc8237', 2.8);
      strokeLine(ctx, [[28, -40], [24, -37]], '#cc8237', 2.8);
      petEye(ctx, -11, -45, 6.5, '#735337'); petEye(ctx, 17, -45, 6.5, '#735337');
    }
    oval(ctx, 9, -31, 16, 9.3, light);
    oval(ctx, 9.5, -34.4, 3.4, 2.5, '#d88b8a');
    oval(ctx, -21, -33, 4.5, 2.7, '#ed9a8a88'); oval(ctx, 27, -33, 3.4, 2.6, '#ed9a8a88');
    strokeLine(ctx, [[-22, -29], [-32, -31]], orange ? '#cc944f' : '#a8afb0', 1);
    strokeLine(ctx, [[25, -28], [33, -29]], orange ? '#cc944f' : '#a8afb0', 1);
  }
  petMouth(ctx, eating, t, otter);
  ctx.restore();
}

/** Compact head portrait for the countdown, using the same face as the companion. */
export function drawPetAvatar(ctx, type, x, y, r = 18) {
  const scale = r / 35;
  drawPet(ctx, type, x, y + 44 * scale, { scale, headOnly: true });
}

/** Round, faceless five-point star matching the local Jike icon silhouette. */
export function drawJikeStar(ctx, x, y, r = 25, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(r, r);
  const glow = ctx.createRadialGradient(0, 0, .35, 0, 0, 1.45);
  glow.addColorStop(0, '#ffe46c32'); glow.addColorStop(.6, '#ffdc4a22'); glow.addColorStop(1, '#ffce2600');
  oval(ctx, 0, 0, 1.45, 1.45, glow);
  const fill = ctx.createRadialGradient(-.07, -.38, .06, 0, .03, 1.05);
  fill.addColorStop(0, '#fff08a'); fill.addColorStop(.4, '#ffe654'); fill.addColorStop(1, '#ffcb19');
  ctx.beginPath(); ctx.moveTo(0, -1);
  ctx.bezierCurveTo(.075, -1, .14, -.97, .18, -.90);
  ctx.lineTo(.37, -.50); ctx.quadraticCurveTo(.39, -.46, .42, -.46);
  ctx.lineTo(.79, -.41); ctx.bezierCurveTo(.99, -.38, 1.07, -.20, .93, -.06);
  ctx.lineTo(.65, .20); ctx.quadraticCurveTo(.61, .23, .62, .27);
  ctx.lineTo(.70, .67); ctx.bezierCurveTo(.75, .91, .57, 1.02, .40, .93);
  ctx.lineTo(.035, .73); ctx.quadraticCurveTo(0, .71, -.035, .73);
  ctx.lineTo(-.40, .93); ctx.bezierCurveTo(-.57, 1.02, -.75, .91, -.70, .67);
  ctx.lineTo(-.62, .27); ctx.quadraticCurveTo(-.61, .23, -.65, .20);
  ctx.lineTo(-.93, -.06); ctx.bezierCurveTo(-1.07, -.20, -.99, -.38, -.79, -.41);
  ctx.lineTo(-.42, -.46); ctx.quadraticCurveTo(-.39, -.46, -.37, -.50);
  ctx.lineTo(-.18, -.90); ctx.bezierCurveTo(-.14, -.97, -.075, -1, 0, -1);
  ctx.closePath(); fillPath(ctx, fill); ctx.restore();
}

function tinyLuckyCat(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  oval(ctx, 0, -5, 7.3, 7.4, '#fff9e5');
  ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(-6, -20); ctx.lineTo(-1, -16);
  ctx.lineTo(3, -16); ctx.lineTo(7, -20); ctx.lineTo(8, -11); ctx.closePath(); fillPath(ctx, '#fff9e5');
  oval(ctx, .5, -11.5, 8, 6.7, '#fff9e5');
  strokeLine(ctx, [[-5, -12], [-2, -13], [0, -12]], '#316470', .8);
  strokeLine(ctx, [[2, -12], [4, -13], [6, -12]], '#316470', .8);
  strokeLine(ctx, [[-6, -4], [6, -4]], '#f27653', 2);
  oval(ctx, 0, -3.6, 1.8, 2, '#ffd657');
  ctx.restore();
}

/** Selected stool C: thin round seat, carrying hole and a wide molded arch. */
export function drawPlasticStool(ctx, x, floor, width = 42, height = 48) {
  ctx.save(); ctx.translate(x, floor); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const w = width, h = height, outline = '#10232c';
  oval(ctx, 0, 1, w * .49, 2.2, '#112d2b');
  const top = -h + 9, side = w * .32;
  ctx.beginPath(); ctx.moveTo(-side, top); ctx.lineTo(-w * .47, -1);
  ctx.lineTo(-w * .23, -1); ctx.lineTo(-w * .17, -h * .33);
  ctx.quadraticCurveTo(0, -h * .47, w * .17, -h * .33);
  ctx.lineTo(w * .23, -1); ctx.lineTo(w * .47, -1); ctx.lineTo(side, top); ctx.closePath();
  fillPath(ctx, '#d8ad51', outline, 1.8);
  strokeLine(ctx, [[-w * .3, -h + 17], [-w * .38, -8]], '#f6da8d', 2);
  strokeLine(ctx, [[w * .29, -h + 18], [w * .38, -7]], '#b4893d', 1.7);
  rounded(ctx, -w * .47, -h + 6, w * .94, 11, [3, 3, 5, 5], '#e3bd63', outline, 1.8);
  oval(ctx, 0, -h + 7, w * .48, 6, '#f5d887', outline, 1.8);
  oval(ctx, 0, -h + 7, w * .16, 1.8, '#9e823f');
  strokeLine(ctx, [[-w * .31, -2], [-w * .23, -2]], '#f5d887', 1.2);
  strokeLine(ctx, [[w * .25, -2], [w * .37, -2]], '#b48b40', 1.2);
  ctx.restore();
}

/** (x,floor) is bottom-center. All painted pixels fit width by height. */
export function drawStore(ctx, x, floor, width = 126, height = 90, variant = 1) {
  ctx.save(); ctx.translate(x, floor); ctx.scale(width / 172, height / 90);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Scale this compact shop to the obstacle's exact bounds (medium table by default).
  rounded(ctx, -86, -76, 172, 76, [3, 3, 1, 1], '#124b58');
  rounded(ctx, -82, -56, 164, 52, 2, variant === 2 ? '#15515e' : '#1c5b66');
  const windowX = variant === 2 ? -31 : -74;
  const doorX = variant === 2 ? -75 : 39;
  const windowW = variant === 2 ? 106 : 103;
  rounded(ctx, windowX, -52, windowW, 40, 1.4, '#8ebdc1', '#093d4b', 2.5);
  // Sparse shelves show through the cyan shop window.
  strokeLine(ctx, [[windowX + 7, -25], [windowX + windowW - 7, -25]], '#6b9fa7', 2);
  for (let i = 0; i < 5; i++) {
    rounded(ctx, windowX + 9 + i * 17, -35, 8, 9, 1, ['#f6d48a', '#d3ece4', '#eaa182'][i % 3]);
  }
  ctx.beginPath(); ctx.moveTo(windowX + 4, -50); ctx.lineTo(windowX + 30, -50);
  ctx.lineTo(windowX + 62, -14); ctx.lineTo(windowX + 44, -14); ctx.closePath(); fillPath(ctx, '#d6f3ed35');
  strokeLine(ctx, [[windowX + windowW * .53, -51], [windowX + windowW * .53, -13]], '#14515d', 2);
  rounded(ctx, doorX, -52, 35, 48, 1, '#9ac5c6', '#083b49', 2.5);
  rounded(ctx, doorX + 4, -47, 27, 26, 1, '#b9d9d5');
  strokeLine(ctx, [[doorX + 26, -20], [doorX + 26, -12]], '#e3ead3', 2);
  rounded(ctx, -86, -10, 172, 10, 1, '#103d49');
  strokeLine(ctx, [[-80, -6], [79, -6]], '#2a6570', 1);
  // Eight alternating stripes, each with a soft hanging scallop.
  const count = 8, stripeW = 172 / count;
  for (let i = 0; i < count; i++) {
    const sx = -86 + i * stripeW;
    const fill = i % 2 ? '#ffd34c' : '#ff8b43';
    ctx.beginPath(); ctx.moveTo(sx, -90); ctx.lineTo(sx + stripeW, -90);
    ctx.lineTo(sx + stripeW, -70);
    ctx.quadraticCurveTo(sx + stripeW, -59, sx + stripeW / 2, -59);
    ctx.quadraticCurveTo(sx, -59, sx, -70); ctx.closePath(); fillPath(ctx, fill);
    if (!(i % 2)) {
      ctx.beginPath(); ctx.moveTo(sx, -70); ctx.lineTo(sx + stripeW, -70);
      ctx.quadraticCurveTo(sx + stripeW, -59, sx + stripeW / 2, -59);
      ctx.quadraticCurveTo(sx, -59, sx, -70); ctx.closePath(); fillPath(ctx, '#e86b32');
    }
  }
  rounded(ctx, -31, -86, 62, 16, 4, '#fff3cf');
  ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#194a54'; ctx.fillText('即士多', 0, -77.4);
  tinyLuckyCat(ctx, variant === 2 ? 56 : -53, -10);
  ctx.restore();
}
