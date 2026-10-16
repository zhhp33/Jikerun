import { drawHead, drawBoxHead, drawPet, drawJikeStar, drawStore, drawAppPickup, drawPlasticStool, drawFootball } from './sprites.js?v=20261016-23-narrow-stool';
import { CONFIG, STOOL_DIMENSIONS } from './engine.js?v=20261016-26-jicoin';
import { cityStyle, drawCity } from './city.js?v=20261016-25-eight-cities';

const W = 720;
const C = { ink: '#0b1822', night: '#102731', gold: '#ffd85c', cream: '#fff4cf', coral: '#f57464', mint: '#8fc3aa', blue: '#91c9db', muted: '#70929a' };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - (1 - clamp(t, 0, 1)) ** 3;
const rand = (a, b) => a + Math.random() * (b - a);
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

function round(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function line(ctx, points, color, width = 3) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function ellipse(ctx, x, y, rx, ry, color, stroke = null, lw = 2) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, Math.PI * 2);
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function star(ctx, x, y, r, fill = C.gold, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rotation - Math.PI / 2 + i * Math.PI / 5, s = i % 2 ? r * .46 : r;
    const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function sparkle(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * .16, y - r * .16, x + r, y);
  ctx.quadraticCurveTo(x + r * .16, y + r * .16, x, y + r); ctx.quadraticCurveTo(x - r * .16, y + r * .16, x - r, y);
  ctx.quadraticCurveTo(x - r * .16, y - r * .16, x, y - r); ctx.fillStyle = fill; ctx.fill();
}
function shoe(ctx, x, y, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  round(ctx, -13, -6, 25, 12, [6, 6, 4, 4], '#232b32', '#070f16', 2.5);
  line(ctx, [[-11, 5], [10, 5]], '#bac7bd', 3); line(ctx, [[-5, -2], [-1, -2]], '#68777b', 2); ctx.restore();
}
function limb(ctx, points, width = 13, color = '#1d252c') {
  line(ctx, points, C.ink, width + 4); line(ctx, points, color, width);
}

// Both leg bones keep their length. Moving a planted foot only opens the knee.
function kneeFor(hip, ankle, bend = 1, upper = 43, lower = 42) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const distance = Math.max(.01, Math.hypot(dx, dy));
  const d = clamp(distance, Math.abs(upper - lower) + .001, upper + lower - .001);
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [hip[0] + dx / distance * along - dy / distance * height * bend, hip[1] + dy / distance * along + dx / distance * height * bend];
}
function leg(ctx, hip, ankle, bend = 1, color = '#202a32', shoeAngle = 0) {
  const knee = kneeFor(hip, ankle, bend);
  limb(ctx, [hip, knee, ankle], 15, color); shoe(ctx, ankle[0], ankle[1], shoeAngle);
}
function ridingFoot(hipX, t, jump = false, front = false) {
  const phase = front ? 0 : 1.1;
  const angle = (front ? .52 : .43) - (jump ? .07 : 0)
    + Math.sin(t * 2.8 + phase) * .035 + Math.sin(t * 5.2 + phase) * .008;
  const reach = 84.2 - .65 * (1 + Math.sin(t * 2.4 + phase)) / 2;
  return [hipX - reach * Math.cos(angle), -64 + reach * Math.sin(angle)];
}
function ridingShoeAngle(t, front = false) { return -.03 + Math.sin(t * 2.8 + (front ? 0 : 1.1)) * .045; }
function smooth(t) { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); }
function fallMotion(seconds) {
  const spread = smooth(seconds / .32);
  const overturn = smooth((seconds - .08) / .30);
  const descent = smooth((seconds - .68) / .42);
  const roll = -.86 * overturn * (1 - descent);
  const yaw = Math.PI * spread + Math.PI * descent;
  return {
    spread, descent, roll, yaw,
    hipY: mix(mix(-64, -94, overturn), -10, descent),
    offsetX: 24 * spread + 56 * descent,
  };
}
function launchMotion(seconds, target = 145) {
  let worldX;
  if (seconds <= .3) worldX = mix(105, 78, ease(seconds / .3));
  else if (seconds <= .6) { const u = clamp((seconds - .3) / .3, 0, 1); worldX = mix(78, 114, u * u * (2 - u)); }
  else worldX = mix(114, target + 92, ease((seconds - .6) / .6));
  // Finish the camera push at the same velocity as the playable acceleration.
  const u = clamp((seconds - .6) / .6, 0, 1), endSlope = CONFIG.kickoffSpeed * .6 / 92;
  const camera = 92 * ((endSlope - 2) * u ** 3 + (3 - endSlope) * u ** 2);
  return { worldX, camera, x: worldX - camera };
}

/** Original office chair. Coordinates are relative to the wheel contact point. */
// Center of the visible caster group, including the chair's (15, -8) offset.
const WHEEL_CENTER = { x: 20, y: 3 };
function playerTilt(p, t, phase) {
  return phase === 'launch' ? 0 : p.y > 0 ? clamp(-p.vy * .00008, -.07, .07) : Math.sin(t * 8) * .006;
}

function officeChair(ctx, tilt = 0, wheel = 0, fill = '#779fac') {
  ctx.save(); ctx.translate(15, -8); ctx.rotate(tilt);
  // Five small casters attached to a metal star base, never oversized wheels.
  line(ctx, [[7, -21], [7, -2]], '#aac3c6', 7);
  line(ctx, [[7, -5], [-31, 7]], '#a4b8b7', 5);
  line(ctx, [[7, -5], [41, 6]], '#b9cccc', 5);
  line(ctx, [[7, -5], [5, 13]], '#91a9ab', 5);
  for (const [x, y] of [[-31, 7], [41, 6], [5, 13]]) {
    round(ctx, x - 6, y - 4, 12, 9, 4, '#152630', '#070f15', 2);
    ellipse(ctx, x + Math.sin(wheel) * 2, y + 1, 1.5, 1.5, '#8aa4aa');
  }
  line(ctx, [[7, -21], [7, -56]], '#a6bfc1', 7);
  line(ctx, [[7, -25], [7, -47]], '#637e85', 3);
  // Slim back post is on the right: the rider faces left and slides backward.
  line(ctx, [[25, -45], [33, -106]], '#708a91', 7);
  ctx.save(); ctx.translate(31, -91); ctx.rotate(.08);
  round(ctx, -13, -31, 29, 64, 10, '#3a5662', '#07151f', 3);
  round(ctx, -8, -26, 18, 53, 7, fill);
  line(ctx, [[-4, -21], [-4, 17]], '#a6cbd1', 2);
  ctx.restore();
  // The dark, shallow seat meets the sitter's rump instead of shining through it.
  round(ctx, -31, -50, 64, 12, 6, '#496d77', C.ink, 3);
  round(ctx, -28, -50, 56, 4, 3, '#72939b');
  ctx.restore();
}

function rider(ctx, t, pose = 'ride', progress = 0) {
  const jump = pose === 'jump';
  ctx.save();
  // Rear arm and legs before the torso.
  limb(ctx, [[12, -107], [-16, -80], [-44, -84]], 10, '#30353b');
  ellipse(ctx, -45, -84, 7, 6, '#efbd96', C.ink, 2);
  leg(ctx, [12, -64], ridingFoot(12, t, jump), 1, '#303940', ridingShoeAngle(t));
  leg(ctx, [2, -64], ridingFoot(2, t, jump, true), 1, '#192229', ridingShoeAngle(t, true));
  ellipse(ctx, 10, -65, 22, 9, '#1b232b');
  // Rounded black hoodie, short neck and small club patch.
  ctx.beginPath(); ctx.moveTo(-5, -113); ctx.quadraticCurveTo(18, -121, 26, -100); ctx.lineTo(32, -67);
  ctx.quadraticCurveTo(8, -51, -14, -68); ctx.lineTo(-17, -96); ctx.quadraticCurveTo(-16, -108, -5, -113);
  ctx.fillStyle = '#1b232b'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
  line(ctx, [[16, -99], [23, -73]], '#4a5259', 2); line(ctx, [[-10, -72], [14, -69]], '#46515a', 2);
  star(ctx, -2, -94, 5, '#b9c7bc', .1);
  limb(ctx, [[0, -105], [-19, -80], [-41, -75]], 12, '#222b33');
  ellipse(ctx, -43, -75, 8, 6, '#f5c5a0', C.ink, 2.5);
  line(ctx, [[-49, -75], [-43, -74]], '#c7906d', 1.5);
  round(ctx, -6, -121, 21, 13, 5, '#1b232b', C.ink, 2);
  drawHead(ctx, -2, -137, { rotation: -.07 + Math.sin(t * 2) * .025 });
  ctx.restore();
}

function fallenRider(ctx, t, crossed = 1) {
  // The pelvis reaches the road at y=0; folded knees rise in front of it.
  ellipse(ctx, -4, -1, 40, 4, '#102c2c');
  leg(ctx, [12, -10], [-49, -8], 1, '#303940', -.03);
  leg(ctx, [2, -10], [-66, -8], 1, '#192229', -.04);
  round(ctx, -21, -65, 48, 64, [18, 20, 12, 12], '#1c252d', C.ink, 2);
  ellipse(ctx, 5, -10, 24, 9, '#1c252d');
  star(ctx, 2, -44, 5, '#b9c7bc');
  drawHead(ctx, 3, -91, { rotation: .04, expression: 'shock' });
  const u = ease(Number(crossed)), left = [mix(-60, 24, u), mix(-55, -98, u)], right = [mix(61, -24, u), mix(-57, -98, u)];
  limb(ctx, [[-16, -50], [mix(-39, -25, u), mix(-55, -71, u)], left], 13, '#252f37');
  limb(ctx, [[24, -49], [mix(43, 31, u), mix(-55, -71, u)], right], 13, '#313b42');
  // Small rounded palms, with no pointing fingers, complete the forearm X.
  ellipse(ctx, left[0], left[1] - 3, 7.5, 10, '#f5c5a0', C.ink, 2.5);
  ellipse(ctx, right[0], right[1] - 3, 7.5, 10, '#f5c5a0', C.ink, 2.5);
}

function hoodie(ctx, hipY = -64) {
  round(ctx, -17, hipY - 49, 46, 54, [18, 18, 12, 12], '#1d2730', C.ink, 3);
  line(ctx, [[16, hipY - 37], [23, hipY - 8]], '#48525a', 2); star(ctx, -1, hipY - 30, 4.5, '#b9c7bc');
}

function launchPosition(seconds, target = 145) {
  return launchMotion(seconds, target).x;
}

function launchRider(ctx, t, seconds, x) {
  const motion = launchMotion(seconds), push = ease((seconds - .3) / .3);
  const charge = seconds <= .3 ? ease(seconds / .3) : 1 - push;
  const release = ease((seconds - .6) / .5), hipY = -64;
  // First the feet are pinned to the step. Release passes through straight legs
  // before settling into the same nearly straight diagonal pose used while riding.
  const straightLeft = [2 - 84.999 * Math.cos(.33), hipY + 84.999 * Math.sin(.33)];
  const straightRight = [12 - 84.999 * Math.cos(.33), hipY + 84.999 * Math.sin(.33)];
  let leftFoot = [38 - motion.worldX, -36], rightFoot = [46 - motion.worldX, -36], bend = 1;
  if (seconds > .6 && seconds <= .82) {
    const u = ease((seconds - .6) / .22);
    leftFoot = [mix(38 - 114, straightLeft[0], u), mix(-36, straightLeft[1], u)];
    rightFoot = [mix(46 - 114, straightRight[0], u), mix(-36, straightRight[1], u)];
  } else if (seconds > .82) {
    const u = ease((seconds - .82) / .38); bend = 1;
    const restLeft = ridingFoot(2, t, false, true), restRight = ridingFoot(12, t);
    leftFoot = [mix(straightLeft[0], restLeft[0], u), mix(straightLeft[1], restLeft[1], u)];
    rightFoot = [mix(straightRight[0], restRight[0], u), mix(straightRight[1], restRight[1], u)];
  }
  const settle = smooth((seconds - .82) / .38);
  leg(ctx, [12, hipY], rightFoot, bend, '#303940', ridingShoeAngle(t) * settle);
  leg(ctx, [2, hipY], leftFoot, bend, '#192229', ridingShoeAngle(t, true) * settle);
  ellipse(ctx, 10, -65, 22, 9, '#1d2730');
  const lean = seconds <= .3 ? mix(-.02, -.47, charge) : mix(mix(-.47, .2, push), -.025, release);
  ctx.save(); ctx.translate(5, hipY); ctx.rotate(lean); ctx.translate(-5, -hipY);
  hoodie(ctx, hipY);
  limb(ctx, [[-8, hipY - 39], [-23, -80], [-43, -75]], 12, '#222b33');
  ellipse(ctx, -44, -75, 8, 6, '#f5c5a0', C.ink, 2);
  drawHead(ctx, -2, hipY - 73, { rotation: -.035 }); ctx.restore();
  if (seconds > .42 && seconds < .88) {
    const dustAge = (seconds - .42) / .46;
    ctx.save(); ctx.globalAlpha = Math.sin(dustAge * Math.PI) * .45;
    for (let i = 0; i < 4; i++) ellipse(ctx, 43 - motion.worldX - dustAge * (16 + i * 5), -32 - Math.sin(dustAge * Math.PI) * (3 + i * 3), 2.5 + dustAge * 2, 1.8, '#d8ddbc');
    ctx.restore();
  }
}

function slidingRider(ctx, t, seconds) {
  const pose = fallMotion(seconds), { spread, descent, roll, yaw, hipY } = pose;
  const restLeft = ridingFoot(2, t, false, true), restRight = ridingFoot(12, t);
  const leftStar = [mix(restLeft[0], -74, spread), mix(restLeft[1] + 64, 36, spread)];
  const rightStar = [mix(restRight[0], 74, spread), mix(restRight[1] + 64, 54, spread)];
  const leftFoot = [mix(leftStar[0], -66, descent), mix(leftStar[1], 2, descent)];
  const rightFoot = [mix(rightStar[0], -49, descent), mix(rightStar[1], 2, descent)];
  const leftHand = [mix(mix(-43, -82, spread), -60, descent), mix(mix(-11, -57, spread), -45, descent)];
  const rightHand = [mix(mix(-45, 87, spread), 61, descent), mix(mix(-20, -66, spread), -47, descent)];
  const leftShoulder = [mix(-8, -16, spread), mix(-39, -40, descent)];
  const rightShoulder = [22, mix(-39, -39, descent)];
  const leftElbow = kneeFor(leftShoulder, leftHand, -1, 35, 37);
  const rightElbow = kneeFor(rightShoulder, rightHand, 1, 35, 37);

  // The whole body tips sideways: one leg rises, the other reaches down,
  // while the arms open across the tilted torso in the video's star shape.
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(roll);
  leg(ctx, [12, 0], rightFoot, 1, '#303940', -.03);
  leg(ctx, [2, 0], leftFoot, 1, '#192229', -.04);
  const bodyWidth = .62 + .38 * Math.abs(Math.cos(yaw));
  ctx.save(); ctx.scale(bodyWidth * (Math.cos(yaw) < 0 ? -1 : 1), 1);
  round(ctx, mix(-17, -21, descent), mix(-49, -55, descent), mix(46, 48, descent), mix(54, 64, descent), [18, 20, 12, 12], '#1d2730', C.ink, 2.5);
  ellipse(ctx, mix(8, 5, descent), 0, mix(23, 24, descent), mix(8, 9, descent), '#1d2730');
  if (Math.cos(yaw) < -.15) {
    line(ctx, [[-8, -41], [17, -40]], '#36424a', 2);
    round(ctx, -3, -55, 16, 13, 4, '#edb694', C.ink, 1.5);
    ellipse(ctx, 0, mix(-73, -81, descent), 27, 30, '#17232b', C.ink, 2);
    ellipse(ctx, -25, mix(-69, -77, descent), 3, 6, '#edb694');
    ellipse(ctx, 25, mix(-69, -77, descent), 3, 6, '#edb694');
    line(ctx, [[-13, -91], [6, -95]], '#34434a', 2);
  } else {
    star(ctx, mix(-1, 2, descent), mix(-30, -34, descent), 5, '#b9c7bc');
    drawHead(ctx, mix(-2, 3, descent), mix(-73, -81, descent), { rotation: .04, expression: 'shock' });
  }
  ctx.restore();
  limb(ctx, [leftShoulder, [mix(leftElbow[0], -39, descent), mix(leftElbow[1], -45, descent)], leftHand], 12, '#29323a');
  limb(ctx, [rightShoulder, [mix(rightElbow[0], 43, descent), mix(rightElbow[1], -45, descent)], rightHand], 12, '#29323a');
  ellipse(ctx, ...leftHand, 8, 8, '#f5c5a0', C.ink, 2);
  ellipse(ctx, ...rightHand, 8, 8, '#f5c5a0', C.ink, 2);
  ctx.restore();
}

function flightRider(ctx, t, vy = 0, landing = false) {
  const sway = Math.sin(t * 4) * 4;
  limb(ctx, [[12, -64], [19, -36], [10 + sway, -9]], 14, '#303940'); shoe(ctx, 8 + sway, -8, .12);
  limb(ctx, [[-2, -64], [-13, -36], [-20 - sway * .5, -12]], 15, '#192229'); shoe(ctx, -24 - sway * .5, -11, -.08);
  hoodie(ctx);
  limb(ctx, [[-9, -102], [-32, -84], [-47, -88]], 11); ellipse(ctx, -49, -88, 7, 6, '#f5c5a0', C.ink, 2);
  limb(ctx, [[22, -102], [40, -83], [48, -93]], 11); ellipse(ctx, 49, -95, 7, 6, '#f5c5a0', C.ink, 2);
  drawBoxHead(ctx, -1, -137, clamp(-vy * .00006, -.05, .05) + (landing ? .02 : 0));
}

function furniture(ctx, obstacle, x, floor) {
  const { type, width = STOOL_DIMENSIONS.width, height = STOOL_DIMENSIONS.lowHeight } = obstacle;
  ctx.save(); ctx.translate(x, floor);
  if (type === 'stool') {
    const count = clamp(obstacle.count || 1, 1, 3), gap = STOOL_DIMENSIONS.gap;
    const h = height, w = (width - (count - 1) * gap) / count;
    for (let i = 0; i < count; i++) {
      drawPlasticStool(ctx, -width / 2 + w / 2 + i * (w + gap), 0, w, h);
    }
  } else if (type === 'desk') {
    const h = height, w = width;
    const legX = w / 2 - 13, drawerW = Math.min(43, w * .35);
    line(ctx, [[-legX, -h + 12], [-legX, -5]], C.ink, 12);
    line(ctx, [[legX, -h + 12], [legX, -5]], C.ink, 12);
    line(ctx, [[-legX, -h + 12], [-legX, -5]], '#64858e', 9);
    line(ctx, [[legX, -h + 12], [legX, -5]], '#64858e', 9);
    line(ctx, [[-legX, -h * .4], [legX, -h * .4]], C.ink, 7);
    line(ctx, [[-legX, -h * .4], [legX, -h * .4]], '#4a6874', 5);
    round(ctx, -w / 2 + 1, -h + 1, w - 2, 16, 4, '#d7b47d', C.ink, 2);
    round(ctx, -w / 2 + 3, -h + 3, w - 6, 4, 2, '#ffe0a0');
    round(ctx, legX - drawerW - 1, -h + 18, drawerW, 25, 2, '#8b9f9d', C.ink, 2);
    line(ctx, [[legX - drawerW * .72, -h + 30], [legX - drawerW * .3, -h + 30]], '#dddebe', 3);
  } else if (type === 'store') drawStore(ctx, 0, 0, width, height, obstacle.storeVariant || 1);
  ctx.restore();
}

function goldenBird(ctx, x, y, t) {
  const flap = Math.sin(t * 9) * 10;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * .035);
  // Two simple swept wings and a small pointed tail echo a flying-bird mark.
  ctx.beginPath(); ctx.moveTo(-3, 2); ctx.quadraticCurveTo(-9, -8, -21, -13 - flap * .65);
  ctx.quadraticCurveTo(-12, 2, 3, 6); ctx.closePath(); ctx.fillStyle = '#d9c786'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-24, -1); ctx.lineTo(-19, 8); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fillStyle = '#f4db9a'; ctx.fill();
  ellipse(ctx, 1, 4, 14, 6.5, '#fff0bf');
  ctx.beginPath(); ctx.moveTo(-2, 4); ctx.quadraticCurveTo(-5, -7, -12, -19 - flap);
  ctx.quadraticCurveTo(7, -12 - flap * .2, 10, 3); ctx.closePath(); ctx.fillStyle = '#fff3ce'; ctx.fill();
  ellipse(ctx, 14, -1, 5.5, 5.5, '#fff0bf');
  ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(25, 0); ctx.lineTo(18, 2); ctx.closePath(); ctx.fillStyle = '#edc96a'; ctx.fill();
  ellipse(ctx, 16, -2, 1, 1, '#6f765c'); ctx.restore();
}

export class Renderer {
  constructor(canvas, { images = {} } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.images = images;
    this.effects = []; this.elapsed = 0; this.lastState = null; this.hit = 0;
    this.city = 'shanghai';
    this.images.jicoin = new Image();
    this.images.jicoin.src = new URL('./assets/jicoin.svg', import.meta.url).href;
    this.height = 0; this.floor = 0; this.syncLayout();
    const random = seeded(26841);
    this.stars = Array.from({ length: 128 }, (_, i) => ({ x: random() * W, y: random(), r: .5 + random() * 1.5, phase: random() * 6.28, cross: i % 15 === 0 }));
    this.rocks = Array.from({ length: 28 }, () => ({ x: random() * 1000, depth: random(), r: 1 + random() * 4 }));
  }

  syncLayout() {
    const H = this.canvas.width > 0 && this.canvas.height > 0 ? this.canvas.height / this.canvas.width * W : 1120;
    const floor = H * .78, delta = floor - this.floor;
    if (this.floor && Math.abs(delta) > .01) {
      for (const f of this.effects) {
        if (typeof f.y === 'number') f.y += delta;
        if (typeof f.targetY === 'number') f.targetY += delta;
      }
    }
    this.height = H; this.floor = floor;
  }

  handleEvent(event) {
    this.syncLayout();
    const FLOOR = this.floor, s = this.lastState, x = event.x ?? s?.player.x ?? 145, y = FLOOR - (event.y ?? 50);
    if (event.type === 'start') { this.effects = []; this.hit = 0; }
    if (event.type === 'revive') {
      this.effects = []; this.hit = 0;
      this.burst(x, FLOOR - 65, 18, C.gold, 'spark');
    }
    if (event.type === 'jump') {
      this.burst(x - 5, event.double ? y - 8 : FLOOR - 5, event.double ? 14 : 10, event.double ? '#c6dcff' : '#a2c0b6', event.double ? 'spark' : 'dust');
      if (event.double) this.effects.push({ kind: 'ring', x: x + WHEEL_CENTER.x, y: y + WHEEL_CENTER.y, age: 0, life: .4, color: '#b6d9ed' });
    }
    if (event.type === 'land') this.burst(x, FLOOR - 1, 12, '#aec8bb', 'dust');
    if (event.type === 'flight-lift') this.burst(x, y - 6, 9, '#b9d8dd', 'spark');
    if (event.type === 'flight-land') this.burst(x, FLOOR - 2, 12, '#c4d6c3', 'dust');
    if (event.type === 'pickup') {
      const colors = { star: C.gold, bird: C.gold, football: C.blue, guoguo: '#f7b55b', keke: '#e9e9d4', otter: '#d4c2ee', high: '#efc06d', double: '#adcce9', flight: '#a6d3d3', reminder: '#cfb7ec', jicoin: C.gold };
      this.burst(x, y, 16, colors[event.pickupType] || C.gold, 'spark');
      const labels = { star: '无敌开溜！', bird: '开始撒钱！', football: '射门时间！', guoguo: '果果，开饭！', keke: '科科，开饭！', otter: '水獭，开饭！', high: '跳得更高！', double: '再跳一次！', flight: '起飞！', reminder: '跳跃提醒就位！', jicoin: '即币 +1！' };
      this.effects.push({ kind: 'label', x, y: y - 30, text: labels[event.pickupType] || '', age: 0, life: 1.4, color: colors[event.pickupType] });
      if (event.pickupType === 'bird') this.burst(x, y, 18, C.gold, 'coin');
    }
    if (event.type === 'bonus') {
      const birdX = (s?.player.x ?? x) + 82;
      const birdY = FLOOR - (s?.player.y || 0) - 186 + Math.sin(this.elapsed * 3) * 4;
      this.burst(birdX, birdY + 9, 5, C.gold, 'coin');
      for (const coin of this.effects.slice(-5)) { coin.vx = rand(-42, 48); coin.vy = rand(0, 48); }
    }
    if (event.type === 'shoot') this.burst(x + 30, y, 8, C.blue, 'spark');
    if (event.type === 'destroy') {
      const o = event.obstacle; if (!o) return;
      if (event.method === 'cat') {
        const anchor = this.petAnchor(s);
        this.effects.push({ kind: 'absorb', cat: event.cat || s?.powers.skill || 'guoguo', obstacle: { ...o }, age: 0, life: .6, targetX: anchor.x + 12 * .66, targetY: anchor.y - 28 * .66 });
      }
      else {
        const pieces = o.type === 'stool' ? clamp(o.count || 1, 1, 3) : Math.max(1, Math.round(o.width / 70));
        for (let i = 0; i < pieces; i++) {
          const fragmentX = o.x - o.width / 2 + o.width * (i + .5) / pieces;
          this.burst(fragmentX, FLOOR - o.height / 2, Math.ceil((event.method === 'invincible' ? 22 : 19) / pieces), event.method === 'invincible' ? C.gold : (o.type === 'stool' ? '#e3bd63' : '#b3c7bd'), 'debris');
        }
        this.effects.push({ kind: 'ring', x: o.x, y: FLOOR - o.height / 2, age: 0, life: .35, color: event.method === 'invincible' ? C.gold : C.blue });
      }
    }
    if (event.type === 'hit') { this.hit = .2; this.burst(s?.player.x || 145, FLOOR - 70, 14, C.gold, 'spark'); }
    if (event.type === 'gameover') this.burst((s?.player.x || 145) + 50, FLOOR - 5, 16, '#a5beb0', 'dust');
  }

  burst(x, y, count, color, kind) {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, 0), velocity = kind === 'dust' ? rand(15, 80) : rand(40, 210);
      this.effects.push({ kind, x, y, vx: Math.cos(a) * velocity, vy: Math.sin(a) * velocity, age: 0, life: kind === 'coin' ? rand(.8, 1.4) : rand(.35, .85), r: rand(2, kind === 'dust' ? 7 : 5), rotation: rand(-3, 3), spin: rand(-8, 8), color });
    }
  }

  draw(state, dt = 1 / 60) {
    this.syncLayout();
    this.lastState = state;
    const paused = state.phase === 'paused';
    if (!paused) { this.elapsed += Math.min(dt, .05); this.hit = Math.max(0, this.hit - dt); this.updateEffects(dt); }
    const ctx = this.ctx, t = this.elapsed, H = this.height, FLOOR = this.floor, phase = paused ? state.pausedFrom || 'running' : state.phase;
    const scale = this.canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H); ctx.save();
    if (this.hit > 0) ctx.translate(Math.sin(this.hit * 160) * 3, Math.cos(this.hit * 120) * 2);
    this.background(state, t, phase);
    for (const p of state.pickups || []) this.pickup(p, t);
    for (const o of state.obstacles || []) furniture(ctx, o, o.x, FLOOR);
    if (state.reminderCue > 0) {
      const target = state.obstacles?.find(o => o.id === state.reminderTargetId);
      if (target) {
        ctx.save(); ctx.globalAlpha = clamp(state.reminderCue * 1.4, 0, .7); ctx.setLineDash([5, 6]);
        round(ctx, target.x - target.width / 2 - 4, FLOOR - target.height - 5, target.width + 8, target.height + 8, 8, null, '#ffd98a', 2); ctx.restore();
      }
    }
    this.powerTrail(state, t, phase);
    this.player(state, t, phase);
    this.companion(state, t, phase);
    for (const p of state.projectiles || []) {
      for (let i = 3; i > 0; i--) { ctx.globalAlpha = .12 / i; drawFootball(ctx, p.x - i * 13, FLOOR - p.y, CONFIG.ballRadius * .9, t * 15); }
      ctx.globalAlpha = 1; drawFootball(ctx, p.x, FLOOR - p.y, CONFIG.ballRadius, t * 15);
    }
    this.renderEffects(t); ctx.restore();
  }

  background(state, t, phase) {
    const camera = phase === 'ready' ? 0 : phase === 'launch' ? launchMotion(state.phaseTime).camera : 92;
    const ctx = this.ctx, H = this.height, FLOOR = this.floor, distance = (state.distance || 0) + camera;
    const style = cityStyle(this.city);
    ctx.fillStyle = style.sky[2]; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * .7, H * .36, 10, W * .58, H * .49, Math.max(W, H * .7));
    glow.addColorStop(0, style.sky[0]); glow.addColorStop(.5, style.sky[1]); glow.addColorStop(1, style.sky[2]);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, FLOOR + 20);
    for (const p of this.stars) {
      let x = (p.x - distance * .025) % W; if (x < 0) x += W;
      const y = 32 + p.y * (FLOOR - 70);
      ctx.globalAlpha = .35 + (Math.sin(t * .7 + p.phase) + 1) * .2;
      p.cross ? sparkle(ctx, x, y, p.r * 3, '#d8dcb7') : ellipse(ctx, x, y, p.r, p.r, '#d7e3cc');
    }
    ctx.globalAlpha = 1;
    drawCity(ctx, this.city, FLOOR - 3, distance, H);
    // A matte planetary runway anchors the full-height portrait scene.
    ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = '#25453f'; ctx.fill();
    const ground = ctx.createLinearGradient(0, FLOOR, 0, H); ground.addColorStop(0, style.ground[0]); ground.addColorStop(.35, style.ground[1]); ground.addColorStop(1, style.ground[2]);
    ctx.fillStyle = ground; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    line(ctx, [[0, FLOOR + 1], [W, FLOOR + 1]], '#b1bd82', 2);
    line(ctx, [[0, FLOOR + 5], [W, FLOOR + 5]], '#54725a', 3);
    for (const r of this.rocks) {
      let x = (r.x - distance * (r.depth < .3 ? 1 : 1.3)) % 1000; if (x < 0) x += 1000;
      const y = FLOOR + 26 + r.depth * Math.max(0, H - FLOOR - 26);
      ctx.globalAlpha = .2; ellipse(ctx, x, y, r.r * 2.4, r.r * .6, '#a7bb8e');
    }
    ctx.globalAlpha = .17;
    for (let i = 0; i < 9; i++) { let x = (i * 125 - distance) % 1125; if (x < -100) x += 1125; line(ctx, [[x, FLOOR + 28], [x + 40, FLOOR + 28]], '#c8cf9c', 2); }
    ctx.globalAlpha = 1;
    // A small safe launch step provides real contact for the initial push.
    const stepX = phase === 'ready' ? 0 : -distance;
    if (phase !== 'ready' && stepX > -62) {
      round(ctx, stepX - 8, FLOOR - 30, 63, 30, [3, 3, 0, 0], '#7a9b86', '#193a37', 2);
      round(ctx, stepX - 8, FLOOR - 30, 63, 6, [3, 3, 0, 0], '#bfd2a5');
      line(ctx, [[stepX + 54, FLOOR - 24], [stepX + 54, FLOOR - 2]], '#416954', 2);
    }
    // Opening wind tracks real travel, so the road, scenery and furniture accelerate together.
    const launching = phase === 'launch' && state.phaseTime > .6;
    const runTime = state.runTime || 0, duration = CONFIG.accelerationSeconds;
    if (launching || (phase === 'running' && runTime < duration + .4)) {
      const buildup = launching ? smooth((state.phaseTime - .6) / .6) * .3
        : .3 + .7 * clamp((state.speed - CONFIG.kickoffSpeed) / (CONFIG.startSpeed - CONFIG.kickoffSpeed), 0, 1);
      const fade = phase === 'running' ? 1 - smooth((runTime - duration) / .4) : 1;
      ctx.save(); ctx.globalAlpha = (.1 + buildup * .22) * fade;
      for (let i = 0; i < 8; i++) {
        let x = (i * 139 + 45 - distance * (1 + i % 3 * .08)) % 1112;
        if (x < -110) x += 1112;
        const y = FLOOR - 17 - (i % 5) * 21;
        line(ctx, [[x, y], [x + 18 + buildup * (37 + i % 3 * 9), y]], '#c9d7b8', 1.5);
      }
      ctx.restore();
    }
    if (phase === 'ready') {
      drawJikeStar(ctx, 555, FLOOR - 324 + Math.sin(t) * 5, 19, -.15); sparkle(ctx, 240, FLOOR - 278, 9, C.coral); sparkle(ctx, 613, FLOOR - 142, 8, '#b2d0b7');
    }
  }

  pickup(p, t) {
    const ctx = this.ctx, FLOOR = this.floor;
    const isFlyby = p.type === 'star' || p.type === 'bird';
    const y = FLOOR - p.y + (isFlyby ? 0 : Math.sin(t * 3 + (typeof p.id === 'number' ? p.id : 0)) * 2);
    const isPet = ['guoguo', 'keke', 'otter'].includes(p.type);
    ctx.save();
    if (isFlyby) {
      const speed = Math.hypot(p.vx || -1, p.vy || .3);
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = .3 * (1 - i / 5);
        const tx = p.x - (p.vx || -1) / speed * i * 12, ty = y + (p.vy || .3) / speed * i * 12;
        sparkle(ctx, tx, ty, 5 - i * .7, '#ffdd86');
      }
      ctx.globalAlpha = 1;
    }
    if (isPet) {
      const cy = FLOOR - (p.y || 30) + 30;
      ellipse(ctx, p.x, cy + 2, 31, 5, '#102c2d');
      ctx.globalAlpha = .35 + Math.sin(t * 4) * .08; ellipse(ctx, p.x, cy - 30, 40, 40, null, p.type === 'guoguo' ? '#eab366' : p.type === 'otter' ? '#c7b2d9' : '#d3dfcc', 1.5); ctx.globalAlpha = 1;
      drawPet(ctx, p.type, p.x, cy, { scale: .85, t });
      sparkle(ctx, p.x + 32, cy - 61, 4, C.gold);
    } else if (p.type === 'star') {
      const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, 52); g.addColorStop(0, '#ffd85c44'); g.addColorStop(1, '#ffd85c00'); ctx.fillStyle = g; ctx.fillRect(p.x - 52, y - 52, 104, 104);
      drawJikeStar(ctx, p.x, y, p.r || 25, Math.sin(t * 2) * .13);
    } else if (p.type === 'jicoin') {
      const r = p.r || 25;
      ellipse(ctx, p.x, y, r + 6, r + 6, null, '#e5d7a1', 1.6);
      const icon = this.images.jicoin;
      if (icon.complete && icon.naturalWidth) ctx.drawImage(icon, p.x - r, y - r, r * 2, r * 2);
    } else if (p.type === 'bird') {
      goldenBird(ctx, p.x, y, t + (p.age || 0));
    } else drawAppPickup(ctx, p.type, p.x, y, p.r || 25, t);
    ctx.restore();
  }

  powerTrail(state, t, phase) {
    if (!['running', 'launch'].includes(phase)) return;
    const ctx = this.ctx, FLOOR = this.floor, p = state.player, powers = state.powers || {}, x = phase === 'launch' ? launchPosition(state.phaseTime, p.x) : p.x, y = FLOOR - p.y;
    if (powers.star > 0 || powers.grace > 0) {
      const active = powers.star > 0, blink = !active || powers.star < 2;
      ctx.save(); ctx.globalAlpha = blink ? .4 + Math.sin(t * 18) * .2 : .72;
      const glow = ctx.createRadialGradient(x + WHEEL_CENTER.x, y - 80, 28, x + WHEEL_CENTER.x, y - 80, 115); glow.addColorStop(0, '#ffe38a00'); glow.addColorStop(.65, '#ffd85c12'); glow.addColorStop(1, '#ffd85c00'); ctx.fillStyle = glow; ctx.fillRect(x + WHEEL_CENTER.x - 120, y - 200, 240, 240);
      ellipse(ctx, x + WHEEL_CENTER.x, y - 79, 83, 99, null, active ? '#ffe48b' : '#b4d9d3', 2);
      ctx.setLineDash([8, 13]); ellipse(ctx, x + WHEEL_CENTER.x, y - 79, 89, 105, null, '#ffd965', 1); ctx.setLineDash([]);
      if (active) for (let i = 0; i < 6; i++) { ctx.globalAlpha = (1 - i / 7) * .5; star(ctx, x - 70 - i * 22, y - 50 - Math.sin(t * 5 + i * 1.8) * 23, 4 + (i % 2), '#ffdb69', t + i); }
      ctx.restore();
    }
    if (powers.bird > 0) {
      const birdX = x + 82, birdY = y - 186 + Math.sin(t * 3) * 4;
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const drop = (t * .7 + i * .5) % 1;
        ctx.globalAlpha = (1 - drop) * .75;
        this.coin(birdX + 4 + i * 16 - drop * 12, birdY + 12 + drop * 53, 7, t * 5 + i);
      }
      ctx.globalAlpha = powers.bird < 2 ? .65 + Math.sin(t * 14) * .2 : 1;
      goldenBird(ctx, birdX, birdY, t); ctx.restore();
    }
    if (powers.skill === 'football') drawAppPickup(ctx, 'football', x - 78, y - 45 + Math.sin(t * 4) * 4, 16);
    if (powers.movement === 'high' || powers.movement === 'double') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(playerTilt(p, t, phase));
      ctx.translate(WHEEL_CENTER.x, WHEEL_CENTER.y);
      ctx.globalAlpha = .45 + Math.sin(t * 6) * .12;
      ellipse(ctx, 0, 0, 40, 7, null, powers.movement === 'high' ? '#eac68a' : '#b7d6ef', 2);
      if (powers.movement === 'double') { sparkle(ctx, -33, -11, 4, '#c2e2fa'); sparkle(ctx, 33, -11, 4, '#c2e2fa'); }
      ctx.restore();
    }
    if (p.flying || powers.movement === 'flight') {
      ctx.save(); ctx.globalAlpha = .32;
      for (let i = 0; i < 3; i++) {
        const drift = (t * 36 + i * 14) % 46;
        line(ctx, [[x - 23 + i * 24, y - 1 + drift], [x - 28 + i * 24, y + 12 + drift]], '#b7dadb', 1.5);
      }
      ctx.restore();
    }
  }

  player(state, t, phase) {
    const ctx = this.ctx, FLOOR = this.floor, p = state.player;
    if (phase === 'ready') {
      ellipse(ctx, W * .56, FLOOR + 4, 115, 13, '#122b2e');
      ctx.save(); ctx.translate(W * .56, FLOOR - 4); ctx.scale(1.65, 1.65); officeChair(ctx, .025 * Math.sin(t), t * 2); rider(ctx, t, 'ride'); ctx.restore();
      drawPet(ctx, 'guoguo', 270, FLOOR - 1, { scale: 1.01, t });
      return;
    }
    if (phase === 'falling' || phase === 'gameover') {
      const seconds = phase === 'gameover' ? 1.65 : state.phaseTime;
      const { descent, offsetX } = fallMotion(seconds), endX = p.x + 80;
      const actorX = p.x + offsetX;
      ellipse(ctx, p.x + 12, FLOOR + 4, 80, 8, '#123332');
      ctx.save(); ctx.translate(p.x, FLOOR); officeChair(ctx, Math.sin(clamp(seconds / .7, 0, 1) * Math.PI) * -.08, t); ctx.restore();
      if (seconds >= 1.1) {
        ctx.save(); ctx.translate(endX, FLOOR); fallenRider(ctx, t, phase === 'gameover' ? 1 : clamp((seconds - 1.25) / .4, 0, 1)); ctx.restore();
        if (phase === 'gameover') {
          ctx.save(); ctx.globalAlpha = .8; line(ctx, [[endX - 70, FLOOR - 166], [endX - 77, FLOOR - 176]], C.coral, 3); line(ctx, [[endX - 56, FLOOR - 178], [endX - 59, FLOOR - 190]], C.coral, 3); ctx.restore();
        }
      } else {
        ctx.save(); ctx.translate(actorX, FLOOR - (1 - descent) * p.y); slidingRider(ctx, t, seconds); ctx.restore();
      }
      return;
    }
    const x = phase === 'launch' ? launchPosition(state.phaseTime, p.x) : p.x;
    const y = FLOOR - p.y;
    ctx.save(); ctx.globalAlpha = .3 * (1 - Math.min(p.y / 400, .6)); ellipse(ctx, x + 5, FLOOR + 3, 65 - p.y * .07, 7, '#0b2528'); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(playerTilt(p, t, phase));
    if (p.flying || state.powers?.movement === 'flight') flightRider(ctx, t, p.vy, p.landing);
    else {
      officeChair(ctx, 0, (state.distance || 0) / 10);
      if (phase === 'launch') launchRider(ctx, t, state.phaseTime, x);
      else rider(ctx, t, p.y > 0 ? 'jump' : 'ride');
    }
    ctx.restore();
  }

  petAnchor(state = this.lastState, phase = state?.phase) {
    const p = state?.player || { x: 145, y: 0 };
    if (phase === 'paused') phase = state.pausedFrom || 'running';
    if (phase === 'falling' || phase === 'gameover') {
      const seconds = phase === 'gameover' ? 1.65 : state.phaseTime;
      const { descent, offsetX, hipY, roll } = fallMotion(seconds);
      const ox = mix(-14, -7, descent), oy = mix(9, -2, descent);
      return {
        x: p.x + offsetX + ox * Math.cos(roll) - oy * Math.sin(roll),
        y: this.floor + hipY + ox * Math.sin(roll) + oy * Math.cos(roll) - (1 - descent) * p.y,
      };
    }
    return { x: (phase === 'launch' ? launchPosition(state.phaseTime, p.x) : p.x) - 14, y: this.floor - p.y - 55 };
  }

  companion(state, t, phase) {
    if (phase === 'ready') return;
    const ctx = this.ctx, powers = state.powers || {};
    // The newest suction owns the visible companion until its animation finishes,
    // even when the gameplay power expires or another pickup replaces it.
    const absorbing = [...this.effects].reverse().find(f => f.kind === 'absorb');
    const skillCat = ['guoguo', 'keke', 'otter'].includes(powers.skill) ? powers.skill : null;
    const type = absorbing?.cat || skillCat;
    if (!type) return;
    const { x, y } = this.petAnchor(state, phase);
    for (const effect of this.effects) if (effect.kind === 'absorb') {
      effect.targetX = x + 12 * .66; effect.targetY = y - 28 * .66;
    }
    drawPet(ctx, type, x, y, { scale: .66, t, eating: Boolean(absorbing) });
    if (phase === 'running' || phase === 'launch') {
      // A sleeve under the pet's chest makes the companion visibly held in the lap.
      limb(ctx, [[x + 27, y - 20], [x + 14, y - 7], [x - 6, y - 8]], 9, '#222b33');
      ellipse(ctx, x - 7, y - 8, 6, 4.5, '#f5c5a0', C.ink, 1.8);
    }
    if (!absorbing && powers.skillTime < 2) {
      ctx.save(); ctx.globalAlpha = .4 + Math.sin(t * 20) * .3; sparkle(ctx, x + 22, y - 48, 4, C.gold); ctx.restore();
    }
  }

  coin(x, y, r, spin = 0) {
    const ctx = this.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(spin) * .2);
    const rx = Math.max(r * .25, Math.abs(Math.cos(spin)) * r);
    ellipse(ctx, 2, 1, rx, r, '#c28f35', '#7b642e', 1); ellipse(ctx, 0, 0, rx, r, '#ffdb68', '#fff0ac', 1.5);
    if (rx > r * .5) { ctx.fillStyle = '#8a6d31'; ctx.font = `700 ${r * 1.25}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¥', 0, 1); }
    ctx.restore();
  }

  updateEffects(dt) {
    const step = Math.min(dt, .05);
    for (const f of this.effects) {
      f.age += step;
      if (f.vx !== undefined) { f.x += f.vx * step; f.y += f.vy * step; f.vy += (f.kind === 'dust' ? -18 : 330) * step; f.rotation += f.spin * step; }
    }
    this.effects = this.effects.filter(f => f.age < f.life);
  }

  renderEffects(t) {
    const ctx = this.ctx, FLOOR = this.floor;
    for (const f of this.effects) {
      const p = f.age / f.life; ctx.save(); ctx.globalAlpha = clamp((1 - p) * 1.5, 0, 1);
      if (f.kind === 'absorb') {
        const u = ease(p), o = f.obstacle, x = mix(o.x, f.targetX, u), y = mix(FLOOR - o.height / 2, f.targetY, u);
        // A small open mouth and three quiet airflow curves read as a vacuum,
        // while the furniture itself supplies the comic shrinking motion.
        ctx.save(); ctx.globalAlpha = .13 * Math.sin(p * Math.PI); ctx.strokeStyle = '#d2e3ce'; ctx.lineWidth = 1.4;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(o.x + o.width * .15, FLOOR - o.height * .5 + i * 19);
          ctx.bezierCurveTo(o.x - 40, FLOOR - o.height * .5 + i * 34, f.targetX + 78, f.targetY + i * 14, f.targetX + 3, f.targetY + i * 2); ctx.stroke();
          const v = (p * 2 + (i + 1) / 3) % 1;
          sparkle(ctx, mix(o.x, f.targetX, v), mix(FLOOR - o.height * .5, f.targetY, v) + Math.sin(v * Math.PI) * i * 12, 2.4, '#e8eccc');
        }
        ctx.restore();
        ctx.translate(x, y); ctx.rotate(p * Math.PI * 3); ctx.scale(1 - p * .95, 1 - p * .95); furniture(ctx, o, 0, o.height / 2);
        ctx.restore(); continue;
      }
      if (f.kind === 'label') {
        ctx.globalAlpha = Math.min(1, (1 - p) * 3); ctx.font = '700 20px "PingFang SC", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#122b33'; ctx.strokeText(f.text, f.x, f.y - ease(p) * 27); ctx.fillStyle = f.color || C.gold; ctx.fillText(f.text, f.x, f.y - ease(p) * 27);
      } else if (f.kind === 'ring') ellipse(ctx, f.x, f.y, 10 + p * 48, 10 + p * 48, null, f.color, 3 * (1 - p));
      else if (f.kind === 'coin') this.coin(f.x, f.y, f.r + 4, f.rotation);
      else if (f.kind === 'dust') ellipse(ctx, f.x, f.y, f.r * (1 + p), f.r * .6, f.color);
      else if (f.kind === 'spark') star(ctx, f.x, f.y, f.r * (1 - p) + 1, f.color, f.rotation);
      else if (f.kind === 'debris') { ctx.translate(f.x, f.y); ctx.rotate(f.rotation); round(ctx, -f.r, -f.r * .5, f.r * 2.5, f.r * 1.2, 1.5, f.color, C.ink, 1); }
      ctx.restore();
    }
  }
}

export { drawFootball };
