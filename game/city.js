import { LANDMARK_CITIES, drawLandmarks } from './landmarks.js?v=20261016-24-merlion';

// Ordinary streets are cached separately from each landmark along the route.
export const CITY_STYLES = [...LANDMARK_CITIES];
export const CITY_ROTATION = CITY_STYLES.map(style => style.id);
export function chooseRunCity(mode, fixedId, nextId) {
  const city = cityStyle(mode === 'fixed' ? fixedId : nextId).id;
  const nextCity = mode === 'fixed' ? cityStyle(nextId).id : CITY_ROTATION[(CITY_ROTATION.indexOf(city) + 1) % CITY_ROTATION.length];
  return { city, nextCity };
}

const WIDTH = 1800, HEIGHT = 480;
const cache = new Map();
export function cityStyle(id) { return CITY_STYLES.find(style => style.id === id) || CITY_STYLES[0]; }
function randomFor(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function polygon(ctx, points, fill) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function building(ctx, b, style, far) {
  const { x, w, h, shape, seed } = b, y = HEIGHT - h, base = HEIGHT;
  const random = randomFor(seed), fill = far ? style.far : style.front;
  ctx.fillStyle = fill;
  let windowTop = y + 20;
  if (shape === 0) {
    // A tapered skyscraper with a needle antenna.
    polygon(ctx, [[x, base], [x, y + 64], [x + w * .2, y + 64], [x + w * .2, y + 27], [x + w * .38, y + 27], [x + w * .5, y], [x + w * .64, y + 27], [x + w * .8, y + 27], [x + w * .8, y + 64], [x + w, y + 64], [x + w, base]], fill);
    ctx.fillRect(x + w * .5 - 1, y - 20, 2, 25); windowTop = y + 73;
  } else if (shape === 1) {
    // Stepped Art Deco crown.
    polygon(ctx, [[x, base], [x, y + 46], [x + w * .13, y + 46], [x + w * .13, y + 24], [x + w * .3, y + 24], [x + w * .3, y], [x + w * .7, y], [x + w * .7, y + 24], [x + w * .87, y + 24], [x + w * .87, y + 46], [x + w, y + 46], [x + w, base]], fill);
    windowTop = y + 55;
  } else if (shape === 2) {
    // Sloped glass crown.
    polygon(ctx, [[x, base], [x, y + 43], [x + w, y], [x + w, base]], fill); windowTop = y + 55;
    ctx.strokeStyle = style.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + 43); ctx.lineTo(x + w - 4, y + 3); ctx.stroke();
  } else if (shape === 3) {
    // Two towers and a visible elevated bridge.
    ctx.fillRect(x, y + 24, w * .36, h - 24); ctx.fillRect(x + w * .64, y, w * .36, h);
    ctx.fillStyle = style.edge; ctx.fillRect(x + w * .3, y + h * .36, w * .4, 10);
    ctx.fillStyle = style.accent; ctx.globalAlpha = .32; ctx.fillRect(x + w * .36, y + h * .36 + 3, w * .28, 2); ctx.globalAlpha = 1;
    windowTop = y + 35;
  } else if (shape === 4) {
    // Garden terraces, also varied enough to read at phone size.
    polygon(ctx, [[x, base], [x, y + 70], [x + w * .2, y + 70], [x + w * .2, y + 35], [x + w * .4, y + 35], [x + w * .4, y], [x + w, y], [x + w, base]], fill);
    for (const [inset, level] of [[0, 70], [.2, 35], [.4, 0]]) {
      ctx.fillStyle = style.edge; ctx.fillRect(x + w * inset, y + level + 4, w * (1 - inset), 4);
      ctx.fillStyle = style.accent; ctx.globalAlpha = .44;
      for (let px = x + w * inset + 7; px < x + w - 6; px += 11) { ctx.beginPath(); ctx.ellipse(px, y + level + 1, 5, 5 + random() * 3, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    windowTop = y + 83;
  } else if (shape === 5) {
    // Rounded tower, inset roof deck and vertical glazing.
    ctx.beginPath(); ctx.roundRect(x, y + 12, w, h - 12, [w * .35, w * .35, 0, 0]); ctx.fill();
    ctx.fillRect(x + w * .28, y, w * .44, 16); windowTop = y + 40;
  } else {
    ctx.fillRect(x, y + 10, w, h - 10); ctx.fillRect(x + w * .2, y, w * .28, 16);
  }
  // Deterministic local coordinates keep windows attached while the city scrolls.
  for (let wy = windowTop; wy < base - 12; wy += 16) {
    for (let wx = 9; wx < w - 6; wx += 12) {
      if (shape === 3 && wx > w * .32 && wx < w * .67) continue;
      const lit = random() > .52;
      ctx.globalAlpha = lit ? .36 + random() * .35 : .14;
      ctx.fillStyle = lit ? style.light : style.glass;
      ctx.fillRect(x + wx, wy, shape === 2 || shape === 5 ? 4 : 3, 5);
    }
  }
  ctx.globalAlpha = .3; ctx.fillStyle = style.edge; ctx.fillRect(x + w - 4, windowTop, 2, base - windowTop);
  if (!far && shape === 2) {
    ctx.globalAlpha = .55; ctx.fillStyle = style.accent;
    ctx.fillRect(x + w - 7, windowTop - 3, 2, h * .65);
  }
  ctx.globalAlpha = 1;
}
function layersFor(style) {
  if (cache.has(style.id)) {
    const layers = cache.get(style.id); cache.delete(style.id); cache.set(style.id, layers); return layers;
  }
  const layers = [true, false].map((far, layer) => {
    const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d'), random = randomFor(style.seed + layer * 809);
    let x = 0, i = 0;
    while (x < WIDTH - 100) {
      const w = (far ? 38 : 54) + random() * (far ? 35 : 46);
      const low = style.id === 'paris';
      const h = (far ? 45 : 62) + random() * (low ? 65 : far ? 106 : 125);
      const shape = i % 7;
      building(ctx, { x, w, h, shape, seed: Math.floor(random() * 1000000) }, style, far);
      x += w + (far ? 3 : 16) + random() * 22; i++;
    }
    return canvas;
  });
  cache.set(style.id, layers);
  if (cache.size > 3) cache.delete(cache.keys().next().value);
  return layers;
}
export function drawCity(ctx, id, floor, distance = 0, sceneHeight = 1280) {
  const style = cityStyle(id), layers = layersFor(style);
  const vertical = Math.min(1, Math.max(.38, sceneHeight / 1050));
  layers.forEach((canvas, i) => {
    const shift = ((distance * (i ? .13 : .055)) % WIDTH + WIDTH) % WIDTH;
    ctx.save(); ctx.globalAlpha = i ? .68 : .43;
    const height = HEIGHT * vertical * (i ? 1 : .88);
    for (let tile = -1; tile <= 1; tile++) ctx.drawImage(canvas, tile * WIDTH - shift, floor - height, WIDTH, height);
    ctx.restore();
  });
  if (style.kind === 'landmark') drawLandmarks(ctx, style, floor, distance, sceneHeight);
}
export function drawCityPreview(canvas, id) {
  const ctx = canvas.getContext('2d'), style = cityStyle(id), width = canvas.width, height = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, style.sky[2]); sky.addColorStop(1, style.sky[0]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.scale(width / 720, height / 370); drawCity(ctx, id, 364, 0, 760); ctx.restore();
  ctx.fillStyle = style.accent;
  for (const [x, y] of [[.13, .17], [.46, .1], [.8, .23]]) ctx.fillRect(width * x, height * y, 1.5, 1.5);
}
