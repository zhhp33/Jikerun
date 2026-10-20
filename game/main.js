import { createGame, CONFIG } from './engine.js?v=20261020-03-box-boost';
import { Renderer } from './render.js?v=20261020-03-box-boost';
import { GameAudio } from './audio.js?v=20261020-05-bgm-long';
import { drawAppPickup, drawPetAvatar } from './sprites.js?v=20261017-35-shengchen';
import { CITY_STYLES, cityStyle, drawCityPreview, chooseRunCity } from './city.js?v=20261016-25-eight-cities';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries([
  'game-frame', 'game-canvas', 'welcome', 'hero-sticker', 'ready-footer',
  'hud', 'score', 'distance', 'best', 'toast', 'power-strip', 'jump-cue', 'action-dock', 'action-button',
  'action-icon', 'action-label', 'action-key-hint', 'play-hint', 'pause-panel', 'result-panel', 'result-title', 'final-score',
  'final-distance', 'final-best', 'result-eyebrow', 'result-caption', 'sound-button', 'pause-button',
  'coin-badge', 'coin-count', 'revive-panel', 'revive-count', 'shengchen-cue',
].map((id) => [id, $(id)]));

function readStorage(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Private mode can disable persistence. */ }
}

let best = Math.max(0, Number(readStorage('jike-run-best', '0')) || 0);
let previousBest = best;
let muted = readStorage('jike-run-muted', 'false') === 'true';
let toastTime = 0;
let lastUIPhase = null;
let activePowerKey = '';
let touchControls = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia('(any-pointer: fine)').matches);
let firstHintAvailable = readStorage('jike-run-controls-seen', 'false') !== 'true';
let hintPending = false;
let playHintTime = 0;
let cityMode = readStorage('jike-run-city-mode', 'auto') === 'fixed' ? 'fixed' : 'auto';
let fixedCity = cityStyle(readStorage('jike-run-city', 'shanghai')).id;
let nextCity = cityStyle(readStorage('jike-run-next-city', 'shanghai')).id;
const audio = new GameAudio(!muted);
const renderer = new Renderer(ui['game-canvas']);
renderer.city = cityMode === 'auto' ? nextCity : fixedCity;
try { localStorage.removeItem('jike-run-music'); localStorage.removeItem('jike-run-music-volume'); } catch {}

function updateStyleChoices() {
  document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed', String(cityMode === 'fixed' && button.dataset.city === renderer.city)));
  $('city-auto').setAttribute('aria-pressed', String(cityMode === 'auto'));
  const current = cityStyle(renderer.city).name;
  $('city-selection-note').textContent = cityMode === 'auto'
    ? `当前：${current}。每次开局换一城，暂停和继续不会换城。`
    : `已固定：${current}。可随时改回每局自动轮换。`;
}

function beginCityRun() {
  const pick = chooseRunCity(cityMode, fixedCity, nextCity);
  renderer.city = pick.city;
  if (cityMode === 'auto') {
    nextCity = pick.nextCity;
    writeStorage('jike-run-next-city', nextCity);
  }
  updateStyleChoices();
}

function setupStylePanel() {
  $('city-options').innerHTML = CITY_STYLES.map(style => `<button class="city-choice" type="button" data-city="${style.id}" aria-pressed="false"><canvas width="216" height="128" aria-hidden="true"></canvas><strong>${style.name}</strong><small>${style.detail}</small></button>`).join('');
  document.querySelectorAll('[data-city]').forEach(button => {
    drawCityPreview(button.querySelector('canvas'), button.dataset.city);
    button.addEventListener('click', () => {
      cityMode = 'fixed';
      fixedCity = renderer.city = button.dataset.city;
      writeStorage('jike-run-city-mode', cityMode);
      writeStorage('jike-run-city', fixedCity);
      updateStyleChoices();
    });
  });
  $('city-auto').addEventListener('click', () => {
    cityMode = 'auto';
    writeStorage('jike-run-city-mode', cityMode);
    if (game.state.phase === 'ready' || (game.state.phase === 'gameover' && !game.state.jicoins)) renderer.city = nextCity;
    updateStyleChoices();
  });
  $('style-button').addEventListener('click', () => {
    game.pause(); updateUI();
    $('style-panel').showModal();
  });
  $('style-close').addEventListener('click', () => $('style-panel').close());
  $('style-done').addEventListener('click', () => {
    $('style-panel').close();
    if (game.state.phase === 'paused') resume();
    else if (game.state.phase === 'ready' || (game.state.phase === 'gameover' && !game.state.jicoins)) start();
  });
  updateStyleChoices();
}

function pickupMessage(type) {
  const jump = touchControls ? '轻点屏幕' : '按空格';
  const skill = touchControls ? '点右下角按钮' : '按 ↑ 或点技能按钮';
  return {
  star: '✦ 星星护体，这下谁也拦不住',
  shengchen: '生辰为你续一秒，危急时自动慢放',
  bird: '快鸟返利，每秒额外 +50 分',
  football: `指尖足球！${skill}射门`,
  guoguo: `果果饿了！${skill}吞障碍`,
  keke: `科科饿了！${skill}吞障碍`,
  otter: 'Otterlife帮你解压',
  high: `跳得更高！${jump}起跳`,
  double: '二段跳，现在可以连跳两次',
  flight: `小组件盒子带你飞，${jump}向上飞，${skill}加速`,
  xiaoyuzhou: `小宇宙带你飞，${jump}向上飞`,
  reminder: 'Kuli Kuli 为你翻译，看到圆圈就起跳',
  jicoin: '摔倒后可原地复活',
  }[type];
}

function updateControlCopy() {
  ui['play-hint'].textContent = touchControls ? '轻点屏幕跳跃' : '按空格跳跃';
  ui['action-key-hint'].hidden = touchControls;
}

const game = createGame({ onEvent(event) {
  renderer.handleEvent(event);
  if (event.type === 'start') {
    audio.stop();
    audio.stopMusic();
    beginCityRun();
    audio.play('start');
    audio.startMusic();
    toastTime = 0;
    previousBest = best;
    ui.toast.hidden = true;
    activePowerKey = null;
    hintPending = firstHintAvailable;
    firstHintAvailable = false;
    playHintTime = 0;
  } else if (event.type === 'running') {
    if (hintPending) {
      playHintTime = 1.8;
      hintPending = false;
      writeStorage('jike-run-controls-seen', 'true');
    }
  } else if (event.type === 'revive') {
    audio.stop();
    audio.play('start');
    audio.startMusic();
    showToast('原地复活！得分保留，继续开溜。');
  } else if (event.type === 'pickup') {
    audio.play('pickup');
    showToast(pickupMessage(event.pickupType));
  } else if (event.type === 'destroy') {
    audio.play(event.method === 'cat' ? 'cat' : 'break');
  } else if (event.type === 'bonus') {
    audio.play('coin');
  } else if (event.type === 'pause') {
    audio.stop();
    audio.stopMusic();
  } else if (event.type === 'jump-cue') {
    audio.play('cue');
  } else if (event.type === 'shengchen-start') {
    playHintTime = 0;
    toastTime = 0;
    ui.toast.hidden = true;
    audio.play('cue');
  } else if (event.type === 'flight-lift') {
    audio.play('jump');
  } else if (event.type === 'flight-land') {
    audio.play('land');
  } else if (['jump', 'land', 'shoot', 'hit', 'gameover'].includes(event.type)) {
    if (['jump', 'hit', 'gameover'].includes(event.type)) playHintTime = 0;
    if (event.type === 'hit') { toastTime = 0; ui.toast.hidden = true; audio.stopMusic(); }
    audio.play(event.type);
  }
} });

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  ui.toast.style.animation = 'none';
  requestAnimationFrame(() => { ui.toast.style.animation = ''; });
  toastTime = 2.5;
}

const soundIcons = {
  on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6m0-6-6 6"/></svg>',
};
const pauseIcons = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.6c0-.8.9-1.3 1.6-.9l10 6.4a1.1 1.1 0 0 1 0 1.8l-10 6.4c-.7.4-1.6-.1-1.6-.9z"/></svg>',
};
function updateSoundButton() {
  ui['sound-button'].innerHTML = soundIcons[muted ? 'off' : 'on'];
  ui['sound-button'].setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
  ui['sound-button'].setAttribute('title', muted ? '开启声音' : '关闭声音');
  ui['sound-button'].setAttribute('aria-pressed', String(!muted));
}

function start() {
  audio.prepare();
  accumulator = 0;
  lastFrame = performance.now();
  game.start();
  updateUI();
  ui['game-frame'].focus({ preventScroll: true });
}
function resume() {
  audio.prepare();
  accumulator = 0;
  lastFrame = performance.now();
  game.resume();
  if (game.state.phase !== 'paused') audio.startMusic();
  updateUI();
  ui['game-frame'].focus({ preventScroll: true });
}
function jumpAction() {
  audio.prepare();
  const phase = game.state.phase;
  if (phase === 'ready' || (phase === 'gameover' && !game.state.jicoins)) start();
  else if (phase === 'paused') resume();
  else game.jump();
}

function revive() {
  audio.prepare();
  if (!game.revive()) return;
  accumulator = 0;
  lastFrame = performance.now();
  updateUI();
  ui['game-frame'].focus({ preventScroll: true });
}

function skillAction() {
  audio.prepare();
  return game.useAction();
}

$('start-button').addEventListener('click', start);
$('restart-button').addEventListener('click', start);
$('revive-button').addEventListener('click', revive);
$('resume-button').addEventListener('click', resume);
ui['sound-button'].addEventListener('click', () => {
  muted = !muted;
  writeStorage('jike-run-muted', muted);
  audio.setEnabled(!muted);
  if (!muted && ['launch', 'running'].includes(game.state.phase)) audio.startMusic();
  updateSoundButton();
});
ui['pause-button'].addEventListener('click', () => {
  if (game.state.phase === 'paused') resume();
  else { game.pause(); updateUI(); }
});
ui['action-button'].addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button > 0) return;
  event.preventDefault();
  skillAction();
  ui['action-button'].classList.add('pressed');
});
ui['action-button'].addEventListener('click', (event) => { if (event.detail === 0) skillAction(); });
window.addEventListener('pointerup', () => ui['action-button'].classList.remove('pressed'));
window.addEventListener('pointercancel', () => ui['action-button'].classList.remove('pressed'));

// Every non-control part of the page is a jump target; buttons own their taps.
document.addEventListener('pointerdown', (event) => {
  touchControls = event.pointerType === 'touch' || event.pointerType === 'pen';
  updateControlCopy();
}, { capture: true, passive: true });
document.addEventListener('pointerdown', (event) => {
  if ($('style-panel').open || !event.isPrimary || event.button > 0 || event.target.closest('button,a,input,textarea,select,summary')) return;
  if (!['ready', 'running', 'gameover'].includes(game.state.phase)) return;
  if (event.cancelable) event.preventDefault();
  jumpAction();
});

document.addEventListener('keydown', (event) => {
  if ($('style-panel').open || (event.code === 'Space' && event.target.closest('button'))) return;
  if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  touchControls = false;
  updateControlCopy();
  if (event.code === 'KeyP' || event.code === 'Escape') {
    event.preventDefault();
    if (event.repeat) return;
    if (game.state.phase === 'paused') resume();
    else { game.pause(); updateUI(); }
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (event.repeat) return;
    jumpAction();
  } else if (event.code === 'ArrowUp') {
    event.preventDefault();
    if (event.repeat) return;
    skillAction();
  } else if (event.code === 'Enter' && !event.target.closest('button')) {
    if (['ready', 'gameover', 'paused'].includes(game.state.phase)) { event.preventDefault(); jumpAction(); }
  }
});
function backgroundPause() {
  game.pause();
  updateUI();
  audio.stop();
  audio.stopMusic();
  accumulator = 0;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); });
window.addEventListener('blur', backgroundPause);
let orientation = window.matchMedia('(orientation: landscape)').matches;
window.addEventListener('resize', () => {
  const next = window.matchMedia('(orientation: landscape)').matches;
  if (orientation !== next) { backgroundPause(); orientation = next; }
});
function updatePowers() {
  const p = game.state.powers;
  const powers = [];
  if (p.shengchen > 0 || game.state.shengchenTargetId !== null) powers.push({ id: 'shengchen', image: './assets/shengchen.webp', label: '生辰·续一秒', time: p.shengchen, max: CONFIG.shengchenCharges, counted: true });
  if (p.star > 0) powers.push({ id: 'star', image: './assets/Jellow.svg', label: 'Jellow·星星护体', time: p.star, max: CONFIG.starSeconds });
  if (p.bird > 0) powers.push({ id: 'bird', image: './assets/kuainiaofanli.webp', label: '快鸟返利·有钱花', time: p.bird, max: CONFIG.birdSeconds });
  if (p.skill && p.skillTime > 0) {
    const labels = { football: '指尖足球', guoguo: '果果·消除障碍', keke: '科科·消除障碍', otter: 'Otterlife·消除压力' };
    powers.push({ id: p.skill, art: p.skill, image: p.skill === 'otter' ? './assets/otterlife.webp' : null, label: labels[p.skill], time: p.skillTime, max: CONFIG.skillSeconds });
  }
  if (p.movement && p.movementTime > 0) {
    const labels = { high: '一罐·增高剂', double: '橙·好事成双', flight: '小组件盒子·起飞', xiaoyuzhou: '小宇宙·起飞' };
    const images = { high: './assets/yiguan.webp', double: './assets/cheng.webp', xiaoyuzhou: './assets/xiaoyuzhou.webp' };
    powers.push({ id: p.movement, art: p.movement, image: images[p.movement] || null, label: labels[p.movement], time: p.movementTime, max: CONFIG.movementSeconds });
  }
  if (p.reminders > 0) powers.push({ id: 'reminder', art: 'reminder', label: 'Kuli Kuli·跳跃提醒', time: p.reminders, max: CONFIG.reminderCharges, counted: true });
  if (p.grace > 0 && !p.star) powers.push({ id: 'grace', icon: '✦', label: '缓冲保护', time: p.grace, max: 1 });
  const key = powers.map((power) => power.id).join('|');
  if (key !== activePowerKey) {
    activePowerKey = key;
    ui['power-strip'].innerHTML = powers.map((power) => `<div class="power-chip ${power.id === 'grace' ? 'grace' : ''}" data-power="${power.id}">${power.image ? `<img class="power-image${power.id === 'bird' ? ' power-bird' : ''}" src="${power.image}" alt="" aria-hidden="true" />` : power.art ? '<canvas class="power-image" width="40" height="40" aria-hidden="true"></canvas>' : `<span class="power-emoji" aria-hidden="true">${power.icon}</span>`}<span class="power-name">${power.label.includes('·') ? power.label.split('·').map(part => `<span class="power-label-part">${part}</span>`).join('·<wbr>') : power.label}</span><span class="power-time"></span><span class="power-progress"></span></div>`).join('');
    for (const power of powers.filter((item) => item.art && !item.image)) {
      const icon = ui['power-strip'].querySelector(`[data-power="${power.id}"] canvas`);
      const ctx = icon.getContext('2d');
      if (['guoguo', 'keke', 'otter'].includes(power.art)) drawPetAvatar(ctx, power.art, 20, 20);
      else drawAppPickup(ctx, power.art, 20, 20, 16, 0, { countdown: power.art === 'flight' });
    }
  }
  for (const power of powers) {
    const el = ui['power-strip'].querySelector(`[data-power="${power.id}"]`);
    el.classList.toggle('slowing', power.id === 'shengchen' && game.state.shengchenTargetId !== null);
    el.classList.toggle('expiring', !power.counted && power.time < 2 && power.id !== 'grace');
    el.querySelector('.power-time').textContent = `${Math.ceil(power.time)}${power.counted ? '次' : 's'}`;
    el.querySelector('.power-progress').style.transform = `scaleX(${Math.min(1, power.time / power.max)})`;
  }
  const action = game.currentAction();
  const boost = action === 'boost';
  const skill = boost ? 'boost' : p.skill;
  ui['action-button'].dataset.skill = skill || '';
  const label = boost ? '加速' : skill === 'football' ? '射门' : '吞障碍';
  ui['action-label'].textContent = label;
  ui['action-icon'].textContent = boost ? '⚡' : skill === 'football' ? '⚽' : '🐾';
  ui['action-button'].setAttribute('aria-label', label);
  ui['action-dock'].hidden = !(action && game.state.phase === 'running');
  ui['action-button'].disabled = (boost ? game.state.boostCooldown : game.state.cooldown) > 0 || game.state.phase !== 'running';
}

function positionNotices() {
  if (ui.hud.hidden || (ui['pause-panel'].hidden && ui['revive-panel'].hidden)) return;
  const compact = window.matchMedia('(orientation: landscape) and (max-height: 480px)').matches;
  const preferredTop = ui['game-frame'].clientHeight * (compact ? .14 : .15);
  const top = `${Math.ceil(Math.max(preferredTop, ui.hud.offsetTop + ui.hud.offsetHeight + 12))}px`;
  if (ui['game-frame'].style.getPropertyValue('--notice-top') !== top) {
    ui['game-frame'].style.setProperty('--notice-top', top);
  }
}

function updateUI() {
  const state = game.state;
  const ready = state.phase === 'ready';
  const finished = state.phase === 'gameover';
  const canRevive = finished && state.jicoins > 0;
  const paused = state.phase === 'paused';
  if (state.score > best) { best = state.score; }
  if (state.phase !== lastUIPhase) {
    lastUIPhase = state.phase;
    for (const id of ['welcome', 'hero-sticker', 'ready-footer']) ui[id].hidden = !ready;
    ui.hud.hidden = ready || (finished && !canRevive);
    ui['pause-panel'].hidden = !paused;
    ui['result-panel'].hidden = !(finished && state.jicoins === 0);
    ui['revive-panel'].hidden = !canRevive;
    ui['revive-count'].textContent = state.jicoins;
    ui['power-strip'].hidden = ready || finished || state.phase === 'falling';
    ui['pause-button'].disabled = ready || finished;
    ui['pause-button'].innerHTML = pauseIcons[paused ? 'play' : 'pause'];
    ui['pause-button'].setAttribute('aria-label', paused ? '继续游戏' : '暂停游戏');
    ui['pause-button'].setAttribute('title', paused ? '继续 · P' : '暂停 · P');
    ui['game-frame'].classList.toggle('playing', !ready);
    ui['game-frame'].classList.toggle('paused', paused);
    if (finished) {
      ui['final-score'].textContent = state.score;
      ui['final-distance'].textContent = `${Math.floor(state.distance / 10)} m`;
      ui['final-best'].textContent = best;
      const record = state.score > previousBest && state.score > 0;
      ui['result-panel'].classList.toggle('new-record', record);
      ui['result-title'].textContent = record ? '新纪录' : '这班，先上到这';
      ui['result-caption'].hidden = record;
      ui['result-eyebrow'].textContent = record ? 'A LITTLE FALL. A NEW RECORD.' : 'MISSION: TEMPORARILY FAILED';
      writeStorage('jike-run-best', best);
    }
  }
  ui.score.textContent = String(state.score).padStart(5, '0');
  ui.best.textContent = String(best).padStart(5, '0');
  ui.distance.textContent = `${Math.floor(state.distance / 10)} m`;
  ui['coin-badge'].hidden = state.jicoins === 0;
  const coinLabel = `即币×${state.jicoins}`;
  if (ui['coin-count'].textContent !== coinLabel) ui['coin-count'].textContent = coinLabel;
  updatePowers();
  ui['play-hint'].hidden = !(state.phase === 'running' && playHintTime > 0);
  ui['jump-cue'].hidden = !(state.phase === 'running' && state.reminderCue > 0);
  ui['shengchen-cue'].hidden = !(state.phase === 'running' && state.shengchenTargetId !== null);
  if (!ui['shengchen-cue'].hidden) ui['shengchen-cue'].textContent = '时间慢放';
  if (!ui['jump-cue'].hidden) {
    const logicalHeight = ui['game-canvas'].height / ui['game-canvas'].width * CONFIG.width;
    ui['jump-cue'].style.left = `${Math.min(62, (state.player.x + 100) / CONFIG.width * 100)}%`;
    ui['jump-cue'].style.top = `${Math.max(20, (logicalHeight * .78 - 230) / logicalHeight * 100)}%`;
  }
  positionNotices();
}

let lastFrame = performance.now();
let accumulator = 0;
function fitCanvas() {
  const rect = ui['game-canvas'].getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (width && height && (ui['game-canvas'].width !== width || ui['game-canvas'].height !== height)) {
    ui['game-canvas'].width = width;
    ui['game-canvas'].height = height;
  }
  if (width && height) {
    const floor = height / width * CONFIG.width * .78;
    game.setFlightCeiling(floor - CONFIG.playerHeight - 140, floor - 270);
  }
  positionNotices();
}
new ResizeObserver(fitCanvas).observe(ui['game-frame']);
fitCanvas();
updateSoundButton();
setupStylePanel();
updateControlCopy();
updateUI();
let lastUISync = 0;
function frame(now) {
  const delta = Math.min(0.08, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  accumulator += delta;
  while (accumulator >= CONFIG.step) {
    game.update(CONFIG.step);
    accumulator -= CONFIG.step;
  }
  renderer.draw(game.state, delta);
  if (game.state.phase === 'running') playHintTime = Math.max(0, playHintTime - delta);
  if (toastTime > 0 && game.state.phase !== 'paused') {
    toastTime -= delta;
    if (toastTime <= 0) ui.toast.hidden = true;
  }
  if (now - lastUISync > 50 || lastUIPhase !== game.state.phase) { updateUI(); lastUISync = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
