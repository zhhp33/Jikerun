// A 3:4 record card built from the live crash scene, sized for social feeds.
const CARD_W = 1080, CARD_H = 1440, SCENE_H = 940;
const SITE = 'https://jikerun.abitnicer.com/';
const FONT = '"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif';

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function shareText({ score, meters, city }) {
  return `我在「即刻开溜」坐着转椅途经${city.name}，跑出 ${score} 分新纪录，滑行 ${meters} 米。来挑战我 → ${SITE}`;
}

export async function drawShareCard(scene, { score, meters, city }) {
  const card = document.createElement('canvas');
  card.width = CARD_W; card.height = CARD_H;
  const ctx = card.getContext('2d');
  ctx.fillStyle = city.sky[2]; ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Keep the runway and the fallen rider in frame: crop around the floor line.
  const srcW = scene.width, srcH = Math.min(scene.height, srcW * SCENE_H / CARD_W);
  const srcY = Math.max(0, Math.min(scene.height - srcH, scene.height * .86 - srcH));
  ctx.drawImage(scene, 0, srcY, srcW, srcH, 0, 0, CARD_W, SCENE_H);
  const fade = ctx.createLinearGradient(0, SCENE_H - 320, 0, SCENE_H);
  fade.addColorStop(0, `${city.sky[2]}00`); fade.addColorStop(1, city.sky[2]);
  ctx.fillStyle = fade; ctx.fillRect(0, SCENE_H - 320, CARD_W, 320);

  const logo = await loadImage('./assets/logo.svg');
  if (logo) ctx.drawImage(logo, 64, 60, 76, 76);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4f0df'; ctx.font = `800 40px ${FONT}`;
  ctx.fillText('即刻开溜', 156, 99);
  ctx.textAlign = 'right'; ctx.fillStyle = '#d8e2d4'; ctx.font = `600 24px ${FONT}`;
  ctx.fillText(`${city.english} · ${city.name}`, CARD_W - 64, 99);

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#b3c5b7'; ctx.font = `600 24px ${FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText('A LITTLE FALL. A NEW RECORD.', 72, 990);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = '#f4f0df'; ctx.font = `800 64px ${FONT}`;
  ctx.fillText('新纪录', 72, 1094);
  // The same tilted shout as the result panel's record burst.
  ctx.save();
  ctx.translate(72 + ctx.measureText('新纪录').width + 14, 1076);
  ctx.rotate(12 * Math.PI / 180);
  ctx.fillStyle = '#ffda3b'; ctx.shadowColor = '#ffda3b80'; ctx.shadowBlur = 18;
  ctx.font = `italic 800 34px ${FONT}`;
  ctx.fillText('nb！', 0, -36);
  ctx.fillText('绝了！', 0, 0);
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText('✦', -22, -50);
  ctx.restore();
  ctx.fillStyle = '#ffda3b'; ctx.font = `700 196px ${FONT}`;
  ctx.fillText(String(score), 64, 1278);
  ctx.fillStyle = '#c5d3ca'; ctx.font = `500 34px ${FONT}`;
  ctx.fillText(`滑行 ${meters} m`, 72, 1350);

  ctx.textAlign = 'right'; ctx.fillStyle = '#859b9e'; ctx.font = `600 26px ${FONT}`;
  ctx.fillText(SITE.replace(/^https:\/\/|\/$/g, ''), CARD_W - 64, 1350);
  return new Promise((resolve) => card.toBlob(resolve, 'image/png'));
}

// Build the card ahead of the tap: Safari only allows sharing right after a user gesture.
export async function prepareShareCard(scene, record) {
  const blob = await drawShareCard(scene, record);
  return { file: new File([blob], `jikerun-${record.score}.png`, { type: 'image/png' }), text: shareText(record) };
}

// Returns 'shared', 'cancelled', 'saved' or 'saved-image' so the caller can word its toast.
export async function shareCard({ file, text }) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: '即刻开溜' });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try { await navigator.clipboard.writeText(text); } catch { return 'saved-image'; }
  return 'saved';
}
