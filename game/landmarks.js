// Approved city artwork, shared by the game and route previews.
const BASE = 540, B = BASE;
const REGIONAL_CITIES = [
  { id: 'shanghai', name: '上海', english: 'SHANGHAI', mood: '江畔蓝调', landmarks: '东方明珠 · 金茂大厦 · 环球金融中心 · 上海中心', sky: ['#213b52', '#162d40', '#102330'], far: '#263e52', body: '#36566a', face: '#4d7285', edge: '#72949e', light: '#e3cd94', accent: '#bd90a5', road: ['#385851', '#29453f', '#203733'] },
  { id: 'ningbo', name: '宁波', english: 'NINGBO', mood: '三江暖夜', landmarks: '天封塔 · 环球航运广场 · 鼓楼', sky: ['#304740', '#203932', '#142b2a'], far: '#2c4740', body: '#46665b', face: '#62816b', edge: '#8caa8c', light: '#e2c787', accent: '#b79a70', road: ['#4a6046', '#354b3c', '#263a32'] },
  { id: 'singapore', name: '新加坡', english: 'SINGAPORE', mood: '滨海花园', landmarks: '滨海湾金沙 · 鱼尾狮 · 艺术科学博物馆 · 超级树', sky: ['#263e4d', '#1a333e', '#112932'], far: '#294952', body: '#3b626b', face: '#5f8587', edge: '#91b4a8', light: '#e8cd91', accent: '#b9a0bc', road: ['#3b5a4c', '#2b483e', '#20382f'] },
];
const WORLD_CITIES = [
  { id:'tokyo', name:'东京', english:'TOKYO', mood:'东京夜游', landmarks:'东京塔 · 晴空塔 · 东京都厅', sky:['#3c3b52','#292f43','#172633'], far:'#303e50', body:'#455c70', face:'#617b8b', edge:'#91a6a9', light:'#e4cca0', accent:'#c38c8c', road:['#435952','#30453f','#243832'], source:'https://www.gotokyo.org/en/spot/74/index.html', sourceName:'东京旅游官方指南' },
  { id:'paris', name:'巴黎', english:'PARIS', mood:'塞纳晚风', landmarks:'埃菲尔铁塔 · 凯旋门 · 圣心堂', sky:['#4a414b','#34323c','#202831'], far:'#3d424b', body:'#6e675f', face:'#8d8170', edge:'#b6a78b', light:'#e6c98d', accent:'#c3a681', road:['#5d6050','#454b40','#303a33'], source:'https://www.toureiffel.paris/en/the-monument', sourceName:'埃菲尔铁塔官网' },
  { id:'sydney', name:'悉尼', english:'SYDNEY', mood:'海港轻风', landmarks:'悉尼歌剧院 · 海港大桥 · 悉尼塔', sky:['#264a53','#1c3846','#122a37'], far:'#2b4756', body:'#466775', face:'#7a9498', edge:'#a6beb2', light:'#e0d09a', accent:'#c0b38b', road:['#3f5b50','#2d463e','#203930'], source:'https://www.sydneyoperahouse.com/our-story/conserving-and-celebrating-our-heritage', sourceName:'悉尼歌剧院官网' },
  { id:'newyork', name:'纽约', english:'NEW YORK', mood:'曼哈顿蓝夜', landmarks:'自由女神 · 帝国大厦 · 克莱斯勒大厦 · 世贸中心一号楼', sky:['#2c405c','#1c3048','#112336'], far:'#293e55', body:'#405d76', face:'#628099', edge:'#8da6b5', light:'#e6d39b', accent:'#9ab7ac', road:['#3a5351','#2a403e','#1e3231'], source:'https://www.esbnyc.com/about/architecture-design', sourceName:'帝国大厦官网' },
  { id:'london', name:'伦敦', english:'LONDON', mood:'泰晤士月光', landmarks:'大本钟 · 伦敦眼 · 塔桥', sky:['#34454b','#26373e','#172c32'], far:'#33474d', body:'#5b6b68', face:'#7c8980', edge:'#acb5a0', light:'#e4c995', accent:'#90b7bc', road:['#4a5b4f','#35473d','#283a32'], source:'https://www.parliament.uk/about/living-heritage/building/palace/big-ben/building-clock-tower/', sourceName:'英国议会建筑参考' },
];
export const LANDMARK_CITIES = [...REGIONAL_CITIES, ...WORLD_CITIES].map((city, index) => ({...city, kind: "landmark", seed: 8101 + index * 179, front: city.body, glass: city.face, ground: city.road, detail: city.mood}));

function poly(ctx, points, fill, stroke = null, width = 1.5) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function line(ctx, points, color, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function oval(ctx, x, y, rx, ry, fill, stroke = null, width = 1.5) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function rect(ctx, x, y, w, h, fill, radius = 0) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}
function facade(ctx, path, x, y, w, h, style, bands = false) {
  ctx.save(); ctx.clip(path);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, style.body); grad.addColorStop(.48, style.face); grad.addColorStop(1, style.body);
  ctx.fillStyle = grad; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  for (let row = 0; row < h / 13; row++) {
    if (bands) { ctx.globalAlpha = .3; rect(ctx, x, y + row * 13, w, 1.8, style.edge); }
    for (let col = 0; col < w / 11; col++) {
      if ((row * 7 + col * 11 + row * col) % 9 < 4) {
        ctx.globalAlpha = .2 + (col + row) % 3 * .08;
        rect(ctx, x + 5 + col * 11, y + 5 + row * 13, 3, 4, style.light);
      }
    }
  }
  ctx.restore(); ctx.strokeStyle = style.edge; ctx.lineWidth = 1.3; ctx.stroke(path);
}

function pearl(ctx, cx, h, style) {
  const top = BASE - h;
  // Splayed supports, two principal observation spheres and a fine antenna.
  poly(ctx, [[cx - 36, BASE], [cx - 10, BASE - 108], [cx + 10, BASE - 108], [cx + 36, BASE]], style.body);
  line(ctx, [[cx - 33, BASE], [cx - 7, BASE - 113]], style.edge, 3);
  line(ctx, [[cx + 33, BASE], [cx + 7, BASE - 113]], style.edge, 3);
  rect(ctx, cx - 8, top + 64, 16, h - 64, style.face);
  for (const [cy, radius] of [[BASE - h * .32, 29], [BASE - h * .71, 22], [top + 57, 9]]) {
    oval(ctx, cx, cy, radius, radius * .9, style.body, style.edge);
    oval(ctx, cx, cy, radius, radius * .24, style.accent, style.edge, 1);
    line(ctx, [[cx - radius * .8, cy - radius * .45], [cx + radius * .8, cy - radius * .45]], style.edge, 1.5);
    for (const side of [-1, 1]) line(ctx, [[cx + side * radius * .42, cy - radius * .75], [cx + side * radius * .42, cy + radius * .75]], style.edge, 1);
  }
  line(ctx, [[cx, top + 44], [cx, top]], style.edge, 2);
  oval(ctx, cx, top + 1, 2, 2, style.light);
}
function shanghaiTower(ctx, x, w, h, style) {
  const y = BASE - h, p = new Path2D();
  p.moveTo(x, BASE); p.bezierCurveTo(x + 1, y + 170, x + 15, y + 45, x + 31, y + 10);
  p.quadraticCurveTo(x + w * .62, y - 8, x + w * .79, y + 14);
  p.bezierCurveTo(x + w + 5, y + 90, x + w - 4, y + 200, x + w, BASE); p.closePath();
  facade(ctx, p, x, y, w, h, style);
  ctx.save(); ctx.clip(p); ctx.strokeStyle = style.edge; ctx.globalAlpha = .7; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(x - 60 + i * 32, BASE); ctx.bezierCurveTo(x + 140 + i * 12, y + 240, x - 65 + i * 26, y + 100, x + 25 + i * 15, y); ctx.stroke();
  }
  for (let yy = y + 47; yy < BASE; yy += 43) rect(ctx, x - 2, yy, w + 4, 2, style.edge);
  ctx.restore();
}
function swfc(ctx, x, w, h, style) {
  const y = BASE - h, p = new Path2D();
  p.moveTo(x, BASE); p.lineTo(x + 13, y + 12); p.lineTo(x + w - 13, y); p.lineTo(x + w, BASE); p.closePath();
  p.moveTo(x + 26, y + 21); p.lineTo(x + 23, y + 65); p.lineTo(x + w - 23, y + 65); p.lineTo(x + w - 26, y + 13); p.closePath();
  // Opposite winding leaves the characteristic trapezoid opening transparent.
  facade(ctx, p, x, y, w, h, style);
  line(ctx, [[x + 15, BASE - 5], [x + w * .5, y + 75], [x + w - 12, BASE - 5]], style.edge, 1.5);
}
function jinmao(ctx, x, w, h, style) {
  const y = BASE - h;
  rect(ctx, x, y + h * .42, w, h * .58, style.body);
  for (let i = 0; i < 8; i++) {
    const levelW = w * (1 - i * .075), yy = y + h * .44 - i * h * .051;
    rect(ctx, x + (w - levelW) / 2, yy, levelW, h * .09, i % 2 ? style.face : style.body);
    rect(ctx, x + (w - levelW) / 2 - 2, yy, levelW + 4, 3, style.edge);
  }
  line(ctx, [[x + w / 2, y + 26], [x + w / 2, y - 10]], style.edge, 2);
  for (let row = y + h * .5; row < BASE; row += 14) { ctx.globalAlpha = .3; rect(ctx, x + 5, row, w - 10, 2, style.light); }
  ctx.globalAlpha = 1;
}
function eave(ctx, cx, y, width, style, roof = '#324b41') {
  ctx.beginPath(); ctx.moveTo(cx - width / 2, y - 7); ctx.quadraticCurveTo(cx - width * .3, y + 1, cx, y - 14);
  ctx.quadraticCurveTo(cx + width * .3, y + 1, cx + width / 2, y - 7); ctx.lineTo(cx + width / 2 - 3, y + 1); ctx.lineTo(cx - width / 2 + 3, y + 1); ctx.closePath();
  ctx.fillStyle = roof; ctx.fill(); ctx.strokeStyle = style.edge; ctx.lineWidth = 1.5; ctx.stroke();
}
function pagoda(ctx, cx, h, style) {
  const y = BASE - h, tier = (h - 31) / 7;
  rect(ctx, cx - 43, BASE - 10, 86, 10, style.body);
  for (let i = 0; i < 7; i++) {
    const yy = BASE - 14 - (i + 1) * tier, w = 65 - i * 5;
    rect(ctx, cx - w / 2, yy, w, tier + 2, '#6f6b4f');
    rect(ctx, cx - w / 2 + 4, yy + 6, w - 8, tier - 10, '#746d4c');
    for (const side of [-1, 0, 1]) rect(ctx, cx + side * w * .26 - 3, yy + 9, 6, Math.max(8, tier - 19), '#233d35', 3);
    eave(ctx, cx, yy + 2, w + 23, style);
    line(ctx, [[cx - w / 2 - 5, yy + tier - 5], [cx + w / 2 + 5, yy + tier - 5]], style.accent, 2);
  }
  line(ctx, [[cx, y + 23], [cx, y - 3]], style.accent, 2);
  oval(ctx, cx, y + 4, 3, 5, style.light);
}
function shippingPlaza(ctx, x, w, h, style) {
  const y = BASE - h, p = new Path2D();
  p.moveTo(x, BASE); p.lineTo(x, y + 21); p.quadraticCurveTo(x + w * .5, y - 12, x + w, y + 21);
  p.lineTo(x + w, BASE); p.closePath();
  facade(ctx, p, x, y, w, h, style, true);
  // Heavy side cores frame the broad curved glass facade.
  poly(ctx, [[x, BASE], [x, y + 14], [x + 20, y + 8], [x + 20, BASE]], style.body, style.edge);
  poly(ctx, [[x + w - 20, BASE], [x + w - 20, y + 8], [x + w, y + 14], [x + w, BASE]], style.body, style.edge);
  rect(ctx, x + 21, y + 25, w - 42, 13, '#213f38');
  line(ctx, [[x + 23, y + 41], [x + w - 23, y + 41]], style.accent, 3);
}
function drumTower(ctx, cx, w, h, style) {
  const y = BASE - h;
  rect(ctx, cx - w / 2 + 11, BASE - 60, w - 22, 60, '#52634b');
  rect(ctx, cx - 15, BASE - 43, 30, 46, '#203b32', [15, 15, 0, 0]);
  for (let row = 0; row < 2; row++) {
    const yy = BASE - 90 - row * 28, ww = w - 24 - row * 18;
    rect(ctx, cx - ww / 2, yy, ww, 28, '#6e6c4c');
    for (let i = -2; i <= 2; i++) rect(ctx, cx + i * 17 - 3, yy + 6, 5, 16, '#243c32');
    eave(ctx, cx, yy + 1, ww + 30, style);
  }
  rect(ctx, cx - 18, y + 7, 36, 56, '#84906d');
  oval(ctx, cx, y + 29, 11, 11, '#b9b68b', '#364b3b');
  line(ctx, [[cx, y + 22], [cx, y + 29], [cx + 5, y + 32]], '#435443', 1.5);
  for (let i = 0; i < 4; i++) rect(ctx, cx - 18 + i * 10, y + 1, 6, 10, '#84906d');
}
function sands(ctx, x, w, h, style) {
  const y = BASE - h;
  for (let i = 0; i < 3; i++) {
    const xx = x + i * w * .32, p = new Path2D();
    p.moveTo(xx - 5, BASE); p.quadraticCurveTo(xx + 13, y + 130, xx + 10, y + 22); p.lineTo(xx + 53, y + 22);
    p.quadraticCurveTo(xx + 52, y + 150, xx + 61, BASE); p.closePath();
    facade(ctx, p, xx - 5, y + 22, 67, h - 22, style, true);
    line(ctx, [[xx + 23, y + 28], [xx + 22, BASE]], style.edge, 1.3);
  }
  ctx.beginPath(); ctx.moveTo(x - 29, y + 15); ctx.quadraticCurveTo(x + w * .45, y - 6, x + w + 19, y + 10);
  ctx.quadraticCurveTo(x + w + 11, y + 27, x + w - 25, y + 31); ctx.lineTo(x + 1, y + 31);
  ctx.quadraticCurveTo(x - 22, y + 29, x - 29, y + 15); ctx.closePath(); ctx.fillStyle = style.face; ctx.fill();
  ctx.strokeStyle = style.edge; ctx.lineWidth = 2; ctx.stroke();
  line(ctx, [[x - 13, y + 15], [x + w - 2, y + 13]], '#a4bd9a', 4);
  for (let i = 0; i < 13; i++) { oval(ctx, x - 2 + i * 18, y + 8, 3, 4, '#71917b'); }
}
function merlion(ctx, style) {
  ctx.save(); ctx.translate(0, BASE - 276);
  const stone = '#c8d0bd', shade = '#94aaa1', carving = '#6b8a82', water = '#a7d0cf';
  // A low waterfront plinth keeps the fountain grounded in the street scene.
  oval(ctx, 142, 267, 132, 9, style.face);
  rect(ctx, 124, 250, 131, 19, style.edge, 4);
  rect(ctx, 134, 244, 111, 9, shade, 3);
  line(ctx, [[19, 267], [70, 267], [84, 270], [112, 270]], water, 2);

  const body = new Path2D();
  body.moveTo(169, 106); body.bezierCurveTo(186, 105, 209, 126, 211, 155);
  body.bezierCurveTo(212, 181, 220, 200, 239, 218);
  body.quadraticCurveTo(258, 241, 225, 247);
  body.quadraticCurveTo(199, 257, 166, 242);
  body.quadraticCurveTo(150, 225, 166, 195);
  body.quadraticCurveTo(180, 163, 159, 139); body.closePath();
  const surface = ctx.createLinearGradient(158, 140, 238, 160);
  surface.addColorStop(0, stone); surface.addColorStop(.6, '#b3c1af'); surface.addColorStop(1, shade);
  ctx.fillStyle = surface; ctx.fill(body); ctx.strokeStyle = shade; ctx.lineWidth = 2; ctx.stroke(body);
  ctx.save(); ctx.clip(body);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 153 + col * 17 + (row % 2) * 8.5, y = 142 + row * 12;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8.5, y + 14, x + 17, y);
      ctx.strokeStyle = carving; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  ctx.restore();
  // The curled fish tail fans out at the foot of the scaled body.
  ctx.beginPath(); ctx.moveTo(214, 219); ctx.quadraticCurveTo(234, 211, 247, 195);
  ctx.quadraticCurveTo(262, 219, 248, 238); ctx.quadraticCurveTo(230, 252, 202, 242);
  ctx.quadraticCurveTo(230, 237, 214, 219); ctx.closePath(); ctx.fillStyle = stone; ctx.fill();
  ctx.strokeStyle = shade; ctx.lineWidth = 2; ctx.stroke();
  for (const y of [205, 216, 227]) {
    ctx.beginPath(); ctx.moveTo(218, 239); ctx.quadraticCurveTo(241, 230, 247, y);
    ctx.strokeStyle = carving; ctx.lineWidth = 1.1; ctx.stroke();
  }

  // A scalloped mane and a projecting muzzle read clearly at game scale.
  ctx.beginPath(); ctx.moveTo(174, 19);
  ctx.bezierCurveTo(183, 6, 211, 10, 219, 27);
  ctx.quadraticCurveTo(239, 27, 233, 48); ctx.quadraticCurveTo(252, 59, 237, 77);
  ctx.quadraticCurveTo(252, 96, 230, 109); ctx.quadraticCurveTo(239, 130, 214, 139);
  ctx.quadraticCurveTo(209, 159, 192, 166); ctx.quadraticCurveTo(193, 140, 170, 131);
  ctx.quadraticCurveTo(152, 120, 159, 96); ctx.lineTo(157, 52); ctx.closePath();
  ctx.fillStyle = stone; ctx.fill(); ctx.strokeStyle = shade; ctx.lineWidth = 2; ctx.stroke();
  for (const [x, y] of [[207, 37], [216, 61], [217, 86], [211, 111], [196, 132]]) {
    ctx.beginPath(); ctx.moveTo(x - 7, y - 13); ctx.quadraticCurveTo(x + 9, y, x - 4, y + 15);
    ctx.strokeStyle = carving; ctx.lineWidth = 1.8; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(193, 28); ctx.quadraticCurveTo(173, 19, 161, 37);
  ctx.lineTo(155, 54); ctx.lineTo(138, 70); ctx.lineTo(133, 82); ctx.lineTo(145, 86);
  ctx.lineTo(139, 94); ctx.quadraticCurveTo(149, 110, 171, 106);
  ctx.quadraticCurveTo(189, 107, 192, 85); ctx.lineTo(199, 55); ctx.closePath();
  ctx.fillStyle = '#d4d8c7'; ctx.fill(); ctx.strokeStyle = shade; ctx.lineWidth = 1.7; ctx.stroke();
  oval(ctx, 198, 37, 9, 12, stone, carving, 1.4);
  line(ctx, [[194, 32], [199, 30], [202, 38], [197, 42]], carving, 1.3);
  line(ctx, [[157, 55], [169, 51], [177, 55]], carving, 2.8);
  oval(ctx, 163, 60, 2.8, 2.2, '#466b65');
  poly(ctx, [[138, 72], [148, 73], [144, 79], [134, 80]], carving);
  line(ctx, [[143, 89], [159, 92], [168, 88]], carving, 2.3);
  line(ctx, [[163, 99], [174, 95]], shade, 1.5);

  ctx.beginPath(); ctx.moveTo(143, 90); ctx.bezierCurveTo(89, 77, 26, 132, 22, 253);
  ctx.strokeStyle = water; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(141, 93); ctx.bezierCurveTo(89, 84, 31, 139, 27, 252);
  ctx.strokeStyle = '#c1dcd6'; ctx.lineWidth = 1.5; ctx.stroke();
  line(ctx, [[15, 253], [12, 246]], water, 1.6);
  line(ctx, [[31, 255], [39, 249]], water, 1.6);
  oval(ctx, 24, 258, 22, 4, null, water, 1.8);
  ctx.restore();
}
function lotus(ctx, cx, w, h, style) {
  const y = BASE - h;
  rect(ctx, cx - w * .17, BASE - 33, w * .34, 33, style.body);
  for (const [dx, lift, tilt] of [[-.34, .35, -.7], [.35, .28, .7], [-.16, .75, -.25], [.17, .9, .35], [0, 1, 0]]) {
    ctx.save(); ctx.translate(cx + dx * w * .28, BASE - 25); ctx.rotate(tilt);
    ctx.beginPath(); ctx.moveTo(-w * .1, 0); ctx.quadraticCurveTo(-w * .25, -h * lift * .65, -w * .16, -h * lift);
    ctx.quadraticCurveTo(0, -h * lift * .94, w * .14, -h * lift); ctx.quadraticCurveTo(w * .24, -h * lift * .3, w * .08, 0); ctx.closePath();
    ctx.fillStyle = style.face; ctx.fill(); ctx.strokeStyle = style.edge; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }
  oval(ctx, cx, y + h * .88, w * .4, h * .09, style.body, style.edge);
}
function supertree(ctx, cx, h, width, style) {
  const top = BASE - h;
  poly(ctx, [[cx - 14, BASE], [cx - 8, top + 53], [cx + 8, top + 53], [cx + 14, BASE]], '#4b615c', style.edge);
  line(ctx, [[cx, BASE - 5], [cx - 4, top + 42]], '#839275', 4);
  for (let i = -4; i <= 4; i++) {
    const dx = i * width / 9;
    ctx.beginPath(); ctx.moveTo(cx, top + 88); ctx.quadraticCurveTo(cx + dx * .15, top + 30, cx + dx, top + 13 + Math.abs(i) * 2);
    ctx.strokeStyle = style.accent; ctx.lineWidth = 2.5; ctx.stroke();
  }
  oval(ctx, cx, top + 15, width * .5, 13, null, style.accent, 3);
  oval(ctx, cx, top + 23, width * .39, 10, null, style.edge, 1.5);
  for (let i = 0; i < 6; i++) oval(ctx, cx - 4 + (i % 2) * 8, BASE - 25 - i * 20, 7, 10, '#657a63');
}
function flyer(ctx, cx, cy, radius, style) {
  line(ctx, [[cx - 24, BASE], [cx, cy - 4], [cx + 24, BASE]], style.far, 7);
  oval(ctx, cx, cy, radius, radius, null, style.edge, 2);
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI * 2 * i / 16, x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
    line(ctx, [[cx, cy], [x, y]], style.far, 1); oval(ctx, x, y, 3, 4, style.face);
  }
}

function latticeTower(c,cx,w,h,s,tokyo=false) {
  const y=B-h,p=new Path2D();p.moveTo(cx-w/2,B);p.bezierCurveTo(cx-w*.19,B-h*.31,cx-10,y+h*.36,cx-5,y+25);p.lineTo(cx+5,y+25);p.bezierCurveTo(cx+10,y+h*.36,cx+w*.19,B-h*.31,cx+w/2,B);p.closePath();
  p.moveTo(cx-w*.28,B);p.lineTo(cx+w*.28,B);p.quadraticCurveTo(cx,B-h*.44,cx-w*.28,B);p.closePath();
  c.fillStyle=tokyo?'#9a7770':s.body;c.fill(p);c.strokeStyle=tokyo?'#c0998b':s.edge;c.lineWidth=2;c.stroke(p);
  c.save();c.clip(p);
  for(let i=1;i<13;i++){const yy=y+i*h/13,half=5+(w/2-5)*(i/13)**1.8,next=5+(w/2-5)*((i+1)/13)**1.8;
    if(tokyo&&i%3===0)rect(c,cx-w/2,yy-5,w,10,'#abb1a0');
    line(c,[[cx-half,yy],[cx+half,yy]],s.edge,1.2);line(c,[[cx-half,yy],[cx+next,yy+h/13]],s.edge,1.1);line(c,[[cx+half,yy],[cx-next,yy+h/13]],s.edge,1.1);
  }c.restore();
  for(const [height,width] of [[.24,.64],[.55,.34],[.79,.18]])rect(c,cx-w*width/2,B-h*height,w*width,tokyo&&height===.55?14:5,tokyo?s.accent:s.edge);
  line(c,[[cx,y+30],[cx,y-8]],s.edge,2);
  if(tokyo){rect(c,cx-20,B-h*.56,40,16,'#b19a8d');rect(c,cx-17,B-h*.55,34,6,'#4e626d');}
}
function skytree(c,cx,h,s) {
  const y=B-h;poly(c,[[cx-18,B],[cx-9,B-h*.63],[cx-4,y+60],[cx+4,y+60],[cx+9,B-h*.63],[cx+18,B]],s.body,s.edge);
  for(let i=0;i<14;i++){const yy=B-i*h*.043;line(c,[[cx-14,yy],[cx+12,yy-h*.043]],s.edge,1);}
  for(const [f,w] of [[.63,46],[.79,27]]){const yy=B-h*f;poly(c,[[cx-w/2,yy-13],[cx+w/2,yy-13],[cx+w*.31,yy+7],[cx-w*.31,yy+7]],s.face,s.edge);line(c,[[cx-w/2,yy-7],[cx+w/2,yy-7]],s.accent,3);}
  line(c,[[cx,y+65],[cx,y]],s.edge,3);oval(c,cx,y,2,2,s.light);
}
function government(c,x,w,h,s){
  const y=B-h,p=new Path2D();p.rect(x,y+h*.3,w,h*.7);p.rect(x+5,y,w*.35,h*.42);p.rect(x+w*.65-5,y,w*.35,h*.42);facade(c,p,x,y,w,h,s);
  for(const xx of [x+5,x+w*.65-5]){poly(c,[[xx,y+4],[xx+9,y-7],[xx+w*.35-9,y-7],[xx+w*.35,y+4]],s.face,s.edge);line(c,[[xx+w*.17,y+2],[xx+w*.17,B]],s.edge,2);}
}
function archMonument(c,x,w,h,s) {
  const y=B-h,p=new Path2D();p.rect(x,y,w,h);p.moveTo(x+w*.34,B);p.lineTo(x+w*.66,B);p.lineTo(x+w*.66,y+h*.52);p.arc(x+w*.5,y+h*.52,w*.16,0,Math.PI,true);p.lineTo(x+w*.34,B);p.closePath();
  c.fillStyle=s.body;c.fill(p);c.strokeStyle=s.edge;c.lineWidth=1.5;c.stroke(p);rect(c,x-5,y+13,w+10,8,s.face);rect(c,x+4,y+28,w-8,3,s.edge);
  for(const xx of [x+w*.15,x+w*.77]){rect(c,xx,y+h*.38,w*.08,h*.43,s.face);oval(c,xx+w*.04,y+h*.35,w*.055,h*.045,s.edge);}
  for(let i=0;i<9;i++)rect(c,x+9+i*w*.105,y+2,w*.06,5,s.edge);
}
function sacreCoeur(c,cx,w,h,s) {
  const y=B-h;rect(c,cx-w*.36,B-95,w*.72,95,s.body);poly(c,[[cx-w*.47,B-75],[cx,B-130],[cx+w*.47,B-75]],s.face,s.edge);
  for(const [dx,scale] of [[-.32,.6],[.32,.6],[0,1]]){const xx=cx+dx*w,hh=h*scale,r=w*(dx===0?.22:.12);rect(c,xx-r*.8,B-hh+48,r*1.6,hh-80,s.face);
    c.beginPath();c.moveTo(xx-r,B-hh+53);c.bezierCurveTo(xx-r*1.02,B-hh+16,xx-r*.3,B-hh+7,xx,B-hh-5);c.bezierCurveTo(xx+r*.3,B-hh+7,xx+r*1.02,B-hh+16,xx+r,B-hh+53);c.closePath();c.fillStyle=s.face;c.fill();c.strokeStyle=s.edge;c.stroke();line(c,[[xx,B-hh-3],[xx,B-hh-14]],s.edge,2);
  }for(let i=-2;i<=2;i++)rect(c,cx+i*21-5,B-61,10,42,'#3b4443',[5,5,0,0]);
}
function opera(c,x,w,h,s) {
  rect(c,x-10,B-23,w+20,23,s.body);rect(c,x-15,B-10,w+30,7,s.edge);
  const sails=[[.14,.55,.37],[.36,1,.62],[.62,.81,.52],[.85,.57,.37]];
  for(const [offset,height,width] of sails){const cx=x+w*offset,hh=h*height,ww=w*width,tipX=cx-ww*.19,tipY=B-hh,p=new Path2D();p.moveTo(cx-ww*.49,B-25);p.quadraticCurveTo(cx-ww*.43,B-hh*.56,tipX,tipY);p.bezierCurveTo(cx+ww*.36,B-hh*.81,cx+ww*.6,B-hh*.35,cx+ww*.5,B-25);p.closePath();c.fillStyle=s.face;c.fill(p);c.strokeStyle=s.edge;c.lineWidth=2;c.stroke(p);
    c.save();c.clip(p);for(let i=0;i<4;i++){c.beginPath();c.moveTo(tipX,tipY);c.quadraticCurveTo(cx-ww*.3+i*ww*.19,B-hh*.38,cx-ww*.38+i*ww*.27,B-25);c.strokeStyle=s.edge;c.lineWidth=1;c.stroke();}c.restore();
    poly(c,[[cx-ww*.25,B-25],[cx+ww*.37,B-25],[cx+ww*.09,B-56]],s.body,s.edge,1);
  }line(c,[[x-10,B-23],[x+w+10,B-23]],s.edge,2);
}
function harbourBridge(c,x,w,h,s) {
  const deck=B-38,archY=u=>deck-30-h*(1-(2*u-1)**2);
  for(const xx of [x+8,x+w-32]){rect(c,xx,deck-h*.57,25,h*.57+38,s.body);rect(c,xx-3,deck-h*.57-5,31,8,s.edge);}
  c.beginPath();c.moveTo(x,deck-30);c.quadraticCurveTo(x+w/2,deck-30-h*2,x+w,deck-30);c.strokeStyle=s.face;c.lineWidth=8;c.stroke();
  c.beginPath();c.moveTo(x,deck-20);c.quadraticCurveTo(x+w/2,deck-20-h*1.76,x+w,deck-20);c.strokeStyle=s.edge;c.lineWidth=2;c.stroke();
  for(let i=1;i<14;i++){const u=i/14,xx=x+w*u,yy=archY(u);line(c,[[xx,yy],[xx,deck]],s.edge,1.4);if(i<13)line(c,[[xx,yy],[xx+w/14,archY((i+1)/14)+14]],s.edge,1.3);}
  rect(c,x-10,deck,w+20,8,s.face);line(c,[[x,deck+12],[x+w,deck+12]],s.edge,2);
}
function sydneyTower(c,cx,h,s) {
  const y=B-h;poly(c,[[cx-11,B],[cx-5,y+79],[cx+5,y+79],[cx+11,B]],s.body,s.edge);line(c,[[cx,y+79],[cx,y]],s.edge,2);
  poly(c,[[cx-28,y+46],[cx+28,y+46],[cx+25,y+75],[cx-25,y+75]],'#a89b75',s.edge);oval(c,cx,y+46,28,7,s.accent,s.edge);oval(c,cx,y+74,25,6,s.body,s.edge);rect(c,cx-29,y+56,58,4,s.edge);
}
function empire(c,x,w,h,s) {
  const y=B-h,p=new Path2D();p.moveTo(x,B);p.lineTo(x,y+170);p.lineTo(x+12,y+170);p.lineTo(x+12,y+100);p.lineTo(x+24,y+100);p.lineTo(x+24,y+65);p.lineTo(x+w-24,y+65);p.lineTo(x+w-24,y+100);p.lineTo(x+w-12,y+100);p.lineTo(x+w-12,y+170);p.lineTo(x+w,y+170);p.lineTo(x+w,B);p.closePath();facade(c,p,x,y+65,w,h-65,s);
  rect(c,x+w*.39,y+36,w*.22,34,s.face);line(c,[[x+w/2,y+42],[x+w/2,y]],s.edge,3);
  for(let i=1;i<5;i++)line(c,[[x+i*w/5,y+174],[x+i*w/5,B]],s.edge,1.2);
}
function chrysler(c,x,w,h,s) {
  const y=B-h;rect(c,x,y+126,w,h-126,s.body);c.save();c.globalAlpha=.4;for(let yy=y+137;yy<B;yy+=17){for(let xx=x+7;xx<x+w-4;xx+=12)rect(c,xx,yy,3,5,s.light);}c.restore();
  for(let i=0;i<6;i++){const ww=w*(1-i*.115),cy=y+132-i*17;c.beginPath();c.ellipse(x+w/2,cy,ww/2,ww*.52,0,Math.PI,0);c.lineTo(x+w/2+ww/2,cy+12);c.lineTo(x+w/2-ww/2,cy+12);c.closePath();c.fillStyle=i%2?s.face:s.body;c.fill();c.strokeStyle=s.edge;c.lineWidth=1.5;c.stroke();
    for(const dir of [-1,1])poly(c,[[x+w/2+dir*ww*.1,cy-ww*.3],[x+w/2+dir*ww*.27,cy-ww*.1],[x+w/2+dir*ww*.05,cy-ww*.07]],s.edge);
  }line(c,[[x+w/2,y+47],[x+w/2,y]],s.edge,2);
}
function oneWtc(c,x,w,h,s) {
  const y=B-h,p=new Path2D();p.moveTo(x,B);p.lineTo(x+13,y+84);p.lineTo(x+w-13,y+84);p.lineTo(x+w,B);p.closePath();facade(c,p,x,y+84,w,h-84,s);
  line(c,[[x,B],[x+w-13,y+84],[x+w,B],[x+13,y+84],[x,B]],s.edge,1.4);line(c,[[x+w/2,y+85],[x+w/2,y]],s.edge,2);
}
function liberty(c,cx,h,s) {
  const pedestal=61,base=B-pedestal,headY=base-h*.56,green='#72978c',edge='#a3bdb0';
  rect(c,cx-31,B-18,62,18,s.body);poly(c,[[cx-24,B-18],[cx-19,base],[cx+19,base],[cx+24,B-18]],s.face,s.edge);rect(c,cx-27,base-5,54,10,s.edge);
  poly(c,[[cx-22,base],[cx-13,headY+28],[cx-4,headY+17],[cx+12,headY+21],[cx+27,base]],green,edge);
  for(let i=-1;i<=2;i++)line(c,[[cx+i*5,headY+39],[cx+i*9,base-7]],edge,1);
  oval(c,cx,headY+7,10,14,green,edge);line(c,[[cx-8,headY+29],[cx-27,headY+9],[cx-37,headY-40]],green,12);line(c,[[cx+11,headY+33],[cx+27,headY+60]],green,13);
  poly(c,[[cx+16,headY+45],[cx+30,headY+39],[cx+38,headY+69],[cx+23,headY+75]],green,edge);rect(c,cx-43,headY-51,13,12,green);
  poly(c,[[cx-42,headY-53],[cx-45,headY-65],[cx-36,headY-80],[cx-30,headY-64],[cx-34,headY-53]],s.light);
  for(let i=0;i<7;i++){const a=Math.PI*1.1+i*Math.PI*.8/6;line(c,[[cx+Math.cos(a)*11,headY+Math.sin(a)*10],[cx+Math.cos(a)*22,headY+Math.sin(a)*23]],edge,2);}
}
function clock(c,cx,cy,r,s){oval(c,cx,cy,r,r,s.light,s.edge,2);for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,[[cx+Math.sin(a)*r*.76,cy+Math.cos(a)*r*.76],[cx+Math.sin(a)*r*.87,cy+Math.cos(a)*r*.87]],s.body,1);}line(c,[[cx,cy-r*.55],[cx,cy],[cx+r*.4,cy+r*.2]],s.body,2);}
function bigBen(c,cx,w,h,s) {
  const y=B-h;rect(c,cx-w/2,y+103,w,h-103,s.body);rect(c,cx-w/2-5,y+76,w+10,76,s.face);clock(c,cx,y+111,w*.36,s);
  for(let i=0;i<5;i++)rect(c,cx-w*.43+i*w*.2,y+162,w*.06,h-166,s.edge);
  poly(c,[[cx-w*.44,y+72],[cx-w*.25,y+35],[cx,y+12],[cx+w*.25,y+35],[cx+w*.44,y+72]],s.body,s.edge);
  for(const dx of [-.43,.43]){rect(c,cx+w*dx-3,y+62,6,50,s.edge);poly(c,[[cx+w*dx-7,y+61],[cx+w*dx,y+43],[cx+w*dx+7,y+61]],s.face);}
  line(c,[[cx,y+19],[cx,y]],s.edge,2);rect(c,cx-w/2-8,y+150,w+16,5,s.edge);
}
function wheel(c,cx,cy,r,s) {
  line(c,[[cx-37,B],[cx,cy-1],[cx+37,B]],s.body,6);oval(c,cx,cy,r,r,null,s.edge,3);
  for(let i=0;i<24;i++){const a=i*Math.PI/12,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;line(c,[[cx,cy],[x,y]],s.face,1);oval(c,x,y,4,6,s.face,s.edge,1);}oval(c,cx,cy,6,6,s.face);
}
function towerBridge(c,x,w,h,s) {
  const y=B-h,deck=B-32;
  for(const xx of [x+15,x+w-57]){
    rect(c,xx,y+41,42,h-9,s.body);rect(c,xx-4,y+89,50,5,s.edge);
    for(const dx of [0,28]){rect(c,xx+dx,y+17,14,78,s.face);poly(c,[[xx+dx-3,y+18],[xx+dx+7,y],[xx+dx+17,y+18]],s.body,s.edge);}
    rect(c,xx+13,y+39,16,27,'#344c50',[8,8,0,0]);
  }
  line(c,[[x+54,y+70],[x+w-53,y+70]],s.accent,5);line(c,[[x-25,deck],[x+w+25,deck]],s.accent,6);
  for(const flip of [false,true]){c.save();if(flip){c.translate(x*2+w,0);c.scale(-1,1);}c.beginPath();c.moveTo(x-28,deck-2);c.quadraticCurveTo(x+5,deck-5,x+36,y+78);c.strokeStyle=s.accent;c.lineWidth=3;c.stroke();c.restore();}
  for(let i=0;i<7;i++)line(c,[[x+59+i*(w-112)/7,y+67],[x+69+i*(w-112)/7,y+75]],s.edge,1);
}

// Each landmark has its own sprite and road position. Nothing is painted as a
// city-wide collage, so ordinary streets can separate every attraction.
const landmarks = {
  shanghai: [
    {id:'pearl', name:'东方明珠', width:110, paint:(c,s)=>pearl(c,55,363,s)},
    {id:'jinmao', name:'金茂大厦', width:88, paint:(c,s)=>jinmao(c,12,64,300,s)},
    {id:'swfc', name:'环球金融中心', width:110, paint:(c,s)=>swfc(c,16,78,382,s)},
    {id:'shanghai-tower', name:'上海中心', width:125, paint:(c,s)=>shanghaiTower(c,16,93,445,s)},
  ],
  ningbo: [
    {id:'pagoda', name:'天封塔', width:112, paint:(c,s)=>pagoda(c,56,310,s)},
    {id:'shipping', name:'环球航运广场', width:185, paint:(c,s)=>shippingPlaza(c,14,157,363,s)},
    {id:'drum-tower', name:'鼓楼', width:185, paint:(c,s)=>drumTower(c,92,157,190,s)},
  ],
  singapore: [
    {id:'sands', name:'滨海湾金沙', width:340, paint:(c,s)=>sands(c,35,260,331,s)},
    {id:'merlion', name:'鱼尾狮', width:280, paint:(c,s)=>merlion(c,s)},
    {id:'lotus', name:'艺术科学博物馆', width:160, paint:(c,s)=>lotus(c,80,101,136,s)},
    {id:'supertrees', name:'超级树', width:245, paint:(c,s)=>{supertree(c,64,231,116,s);supertree(c,177,178,96,s);c.beginPath();c.moveTo(64,BASE-153);c.quadraticCurveTo(120,BASE-115,177,BASE-105);c.strokeStyle=s.accent;c.lineWidth=2;c.stroke();}},
    {id:'flyer', name:'新加坡摩天观景轮', width:150, paint:(c,s)=>flyer(c,75,BASE-220,60,s)},
  ],
  tokyo: [
    {id:'tokyo-tower', name:'东京塔', width:168, paint:(c,s)=>latticeTower(c,84,134,357,s,true)},
    {id:'government', name:'东京都厅', width:161, paint:(c,s)=>government(c,16,129,267,s)},
    {id:'skytree', name:'晴空塔', width:80, paint:(c,s)=>skytree(c,40,449,s)},
  ],
  paris: [
    {id:'eiffel', name:'埃菲尔铁塔', width:215, paint:(c,s)=>latticeTower(c,107,181,414,s)},
    {id:'arc', name:'凯旋门', width:172, paint:(c,s)=>archMonument(c,16,140,171,s)},
    {id:'sacre-coeur', name:'圣心堂', width:194, paint:(c,s)=>sacreCoeur(c,97,162,230,s)},
  ],
  sydney: [
    {id:'opera', name:'悉尼歌剧院', width:310, paint:(c,s)=>opera(c,20,270,211,s)},
    {id:'bridge', name:'悉尼海港大桥', width:365, paint:(c,s)=>harbourBridge(c,20,324,172,s)},
    {id:'tower', name:'悉尼塔', width:90, paint:(c,s)=>sydneyTower(c,45,421,s)},
  ],
  newyork: [
    {id:'liberty', name:'自由女神', width:136, paint:(c,s)=>liberty(c,70,249,s)},
    {id:'empire', name:'帝国大厦', width:127, paint:(c,s)=>empire(c,16,95,414,s)},
    {id:'chrysler', name:'克莱斯勒大厦', width:111, paint:(c,s)=>chrysler(c,16,79,352,s)},
    {id:'one-wtc', name:'世贸中心一号楼', width:108, paint:(c,s)=>oneWtc(c,16,76,455,s)},
  ],
  london: [
    {id:'big-ben', name:'大本钟', width:111, paint:(c,s)=>bigBen(c,55,63,365,s)},
    {id:'eye', name:'伦敦眼', width:236, paint:(c,s)=>wheel(c,118,BASE-218,99,s)},
    {id:'tower-bridge', name:'塔桥', width:250, paint:(c,s)=>towerBridge(c,32,186,200,s)},
  ],
};

const routes = new Map();
const spriteCache = new Map();
export const LANDMARK_SCROLL = .17;
export function landmarkRoute(id) {
  if (routes.has(id)) return routes.get(id);
  const specs = landmarks[id];
  if (!specs) return null;
  let cursor = 520 - specs[0].width / 2;
  const first = cursor;
  const items = specs.map(spec => {
    const item = { ...spec, x: cursor };
    cursor += spec.width + 840;
    return item;
  });
  const route = { items, period: cursor - first };
  routes.set(id, route);
  return route;
}
export function visibleLandmarks(id, distance = 0, viewport = 720) {
  const route = landmarkRoute(id);
  if (!route) return [];
  const shift = ((distance * LANDMARK_SCROLL) % route.period + route.period) % route.period;
  const visible = [];
  for (const item of route.items) for (let tile = -1; tile <= 1; tile++) {
    const x = item.x + tile * route.period - shift;
    if (x + item.width + 16 > 0 && x - 16 < viewport) visible.push({ ...item, screenX: x });
  }
  return visible;
}
function spriteFor(city, item) {
  const key = `${city.id}:${item.id}`;
  if (spriteCache.has(key)) {
    const image = spriteCache.get(key); spriteCache.delete(key); spriteCache.set(key, image); return image;
  }
  const image = document.createElement('canvas'); image.width = item.width + 32; image.height = 560;
  const c = image.getContext('2d'); c.translate(16, 0); item.paint(c, city);
  spriteCache.set(key, image);
  if (spriteCache.size > 10) spriteCache.delete(spriteCache.keys().next().value);
  return image;
}
export function drawLandmarks(ctx, city, floor, distance, sceneHeight) {
  const vertical = Math.min(1, Math.max(.38, sceneHeight / 1050));
  ctx.save(); ctx.globalAlpha = .7;
  for (const item of visibleLandmarks(city.id, distance)) {
    const image = spriteFor(city, item);
    ctx.drawImage(image, item.screenX - 16, floor - 540 * vertical, image.width, image.height * vertical);
  }
  ctx.restore();
}
