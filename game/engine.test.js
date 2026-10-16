import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, OBSTACLES, OBSTACLE_VARIANTS, STOOL_DIMENSIONS, allowedObstacleVariants,
  createGame, jumpClearanceWindow, safeObstacleGap, canJumpObstacleNow, findSafeJumpDelay,
  worldSpeedAt, worldDistanceAt,
} from './engine.js';

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function runningGame(random = seededRandom(17)) {
  const events = [];
  const game = createGame({ random, onEvent: (event) => events.push(event) });
  game.start();
  game.update(CONFIG.launchSeconds);
  assert.equal(game.state.phase, 'running');
  return { game, state: game.state, events };
}

function obstacle(state, key = 'desk-short', x = state.player.x + 200, id = 9000) {
  const { minSpeed, ...shape } = OBSTACLE_VARIANTS.find((item) => item.key === key);
  const item = { id, x, ...shape };
  state.obstacles.push(item);
  return item;
}

function pickup(game, type) {
  game.state.pickups.push({ id: 8000, type, x: game.state.player.x, y: game.state.player.y + 60, r: 25 });
  game.update(CONFIG.step);
}

function clearWorld(state) {
  state.obstacles.length = 0;
  state.pickups.length = 0;
  state.projectiles.length = 0;
}

function resetPowers(state) {
  Object.assign(state.powers, { star: 0, bird: 0, skill: null, skillTime: 0, grace: 0, movement: null, movementTime: 0, reminders: 0 });
}

function advanceToSpeed(game, speed) {
  game.state.powers.star = 1000;
  game.update(CONFIG.accelerationSeconds
    + (speed - CONFIG.startSpeed) / ((CONFIG.maxSpeed - CONFIG.startSpeed) / CONFIG.rampSeconds));
  assert.ok(Math.abs(game.state.speed - speed) < 1e-6);
  clearWorld(game.state);
  resetPowers(game.state);
}

function observeRun(game, seconds) {
  const obstacles = [];
  const pickups = [];
  const seen = new Set();
  const { state } = game;
  state.powers.star = 1000;
  for (let index = 0; index < seconds * 120; index += 1) {
    game.update(CONFIG.step);
    for (const item of state.obstacles) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      obstacles.push({ ...item, speed: state.speed, distance: state.distance, time: state.time - CONFIG.launchSeconds });
    }
    for (const item of state.pickups) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      pickups.push({ ...item, time: state.time - CONFIG.launchSeconds });
    }
  }
  return { obstacles, pickups };
}

test('launch and failure have distinct animation phases before game over', () => {
  const { game, state, events } = runningGame();
  assert.equal(events[0].type, 'start');
  assert.equal(events[1].type, 'running');
  obstacle(state, 'desk-short', state.player.x);
  game.update(CONFIG.step);
  assert.equal(state.phase, 'falling');
  assert.equal(events.at(-1).type, 'hit');
  const score = state.score;
  game.update(CONFIG.fallSeconds - 0.1);
  assert.equal(state.phase, 'falling');
  assert.equal(state.score, score);
  game.update(0.1);
  assert.equal(state.phase, 'gameover');
  assert.equal(events.at(-1).type, 'gameover');
});

test('the three-second opening accelerates progressively, freezes on pause, and resets on retry', () => {
  const { game, state } = runningGame();
  assert.equal(state.speed, CONFIG.kickoffSpeed);
  assert.equal(state.runTime, 0);
  const speeds = [state.speed];
  for (let index = 0; index < 6; index++) {
    game.update(.5);
    speeds.push(state.speed);
    assert.equal(state.phase, 'running');
  }
  assert.ok(speeds.every((speed, index) => index === 0 || speed > speeds[index - 1]));
  assert.ok(Math.abs(state.speed - CONFIG.startSpeed) < 1e-6);
  assert.ok(state.speed / speeds[0] >= 2.5 - 1e-6);
  assert.ok(Math.abs(state.distance - 630) < 1e-6);
  game.togglePause();
  const frozen = structuredClone(state);
  game.update(5);
  assert.deepEqual(state, frozen);
  game.togglePause();
  game.update(.1);
  assert.ok(state.distance > frozen.distance);
  assert.ok(state.speed > CONFIG.startSpeed && state.speed < CONFIG.startSpeed + 1);
  game.start();
  assert.equal(state.runTime, 0);
  assert.equal(state.distance, 0);
  assert.equal(state.speed, CONFIG.kickoffSpeed);
  assert.equal(worldSpeedAt(CONFIG.accelerationSeconds), CONFIG.startSpeed);
  assert.ok(Math.abs(worldDistanceAt(3.0001) - worldDistanceAt(3) - .03) < 1e-6);
});

test('furniture and stationary pickups share the actual accelerating ground travel', () => {
  const { game, state } = runningGame();
  const item = obstacle(state, 'stool-1', 4000);
  const prop = { id: 7999, type: 'football', x: 4500, y: 260, r: 25 };
  state.pickups.push(prop);
  let priorDistance = 0, priorObstacleX = item.x, priorPickupX = prop.x;
  const halfSecondTravel = [];
  for (let index = 0; index < 6; index++) {
    game.update(.5);
    const travel = state.distance - priorDistance;
    assert.ok(Math.abs(priorObstacleX - item.x - travel) < 1e-8);
    assert.ok(Math.abs(priorPickupX - prop.x - travel) < 1e-8);
    halfSecondTravel.push(travel);
    priorDistance = state.distance;
    priorObstacleX = item.x;
    priorPickupX = prop.x;
  }
  assert.ok(halfSecondTravel.every((travel, index) => index === 0 || travel > halfSecondTravel[index - 1]));
  assert.ok(halfSecondTravel.at(-1) > halfSecondTravel[0] * 2.3);
});

test('all three opening shapes arrive after acceleration and retain a real 100ms jump window', () => {
  for (const [randomValue, key] of [[0, 'stool-1'], [.4, 'stool-2'], [.8, 'desk-short']]) {
    const quiet = runningGame(() => randomValue);
    quiet.game.update(CONFIG.step);
    const first = quiet.state.obstacles[0];
    assert.equal(first.type, key.startsWith('stool') ? 'stool' : 'desk');
    if (first.type === 'stool') assert.equal(first.count, Number(key.at(-1)));
    assert.equal(first.x, CONFIG.openingSpawnX);
    let enteredAt;
    while (quiet.state.phase === 'running') {
      quiet.game.update(CONFIG.step);
      if (enteredAt === undefined && first.x - first.width / 2 <= CONFIG.width) enteredAt = quiet.state.runTime;
    }
    assert.ok(quiet.state.runTime > CONFIG.accelerationSeconds, `${key} must arrive after the opening acceleration`);
    assert.ok(quiet.state.time >= 4, 'initial push and acceleration leave four seconds before a collision');
    assert.ok(quiet.state.runTime - enteredAt >= 1.8, 'the first obstacle stays visible for a generous warning');

    let consecutive = 0, longest = 0;
    for (let takeoff = 2.55; takeoff <= 3.1; takeoff += .01) {
      const { game, state } = runningGame(() => randomValue);
      game.update(takeoff);
      const target = state.obstacles[0];
      assert.equal(game.jump(), true, 'jump remains available throughout the acceleration');
      for (let elapsed = 0; elapsed < 1; elapsed += CONFIG.step) {
        state.obstacles = state.obstacles.filter(item => item.id === target.id);
        game.update(CONFIG.step);
      }
      const cleared = state.phase === 'running' && target.x + target.width / 2 < state.player.x - CONFIG.playerWidth / 2;
      consecutive = cleared ? consecutive + 1 : 0;
      longest = Math.max(longest, consecutive);
    }
    assert.ok((longest - 1) * .01 >= CONFIG.minJumpWindow, `${key} needs a real, continuous takeoff window`);
  }
});

for (const template of OBSTACLE_VARIANTS) {
  test(`${template.key} is actually jumpable at its unlocking speed and maximum speed`, () => {
    for (const speed of [template.minSpeed, CONFIG.maxSpeed]) {
      const { game, state } = runningGame();
      advanceToSpeed(game, speed);
      const apexTime = CONFIG.jumpV / CONFIG.gravity;
      const item = obstacle(state, template.key, state.player.x + speed * apexTime);
      assert.equal(game.jump(), true);
      assert.equal(game.jump(), false, 'repeating cannot double-jump');
      game.update((2 * CONFIG.jumpV) / CONFIG.gravity + 0.02);
      assert.equal(state.phase, 'running', `${template.key} must be clearable at ${speed}`);
      assert.equal(state.player.onGround, true);
      assert.equal(state.player.y, 0);
      assert.ok(item.x + item.width / 2 < state.player.x - CONFIG.playerWidth / 2);
    }
  });
}

test('jump and action always jump with a skill; the separate skill button never substitutes a jump', () => {
  const { game, state } = runningGame();
  assert.equal(game.useSkill(), false);
  assert.equal(state.player.onGround, true);
  pickup(game, 'football');
  assert.equal(game.action, game.jump);
  assert.equal(game.action(), true);
  assert.equal(state.player.onGround, false);
  assert.equal(state.projectiles.length, 0);
  game.update((2 * CONFIG.jumpV) / CONFIG.gravity + 0.02);
  pickup(game, 'guoguo');
  assert.equal(game.jump(), true);
  assert.equal(state.player.onGround, false);
});

test('every newly allowed shape has at least 100ms of continuous successful takeoff timing', () => {
  const sampleInterval = 0.005;
  for (const template of OBSTACLE_VARIANTS) {
    let consecutive = 0;
    let longest = 0;
    for (let sample = -20; sample <= 20; sample += 1) {
      const { game, state } = runningGame();
      advanceToSpeed(game, template.minSpeed);
      // Moving arrival time relative to one takeoff sweeps the actual input window.
      const arrivalTime = CONFIG.jumpV / CONFIG.gravity + sample * sampleInterval;
      obstacle(state, template.key, state.player.x + template.minSpeed * arrivalTime);
      game.jump();
      game.update((2 * CONFIG.jumpV) / CONFIG.gravity + 0.2);
      consecutive = state.phase === 'running' ? consecutive + 1 : 0;
      longest = Math.max(longest, consecutive);
    }
    const continuousWindow = (longest - 1) * sampleInterval;
    const requiredWindow = template.key === 'store' ? 0.20 : template.key === 'desk-long' ? 0.15 : CONFIG.minJumpWindow;
    assert.ok(
      continuousWindow >= requiredWindow - CONFIG.step,
      `${template.key} at ${template.minSpeed} only allowed ${continuousWindow.toFixed(3)}s`,
    );
  }
});

test('football fired while airborne stays at road height, clears a complete group, and respects cooldown', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'football');
  game.jump();
  game.update(0.18);
  assert.ok(state.player.y > 100);
  const near = obstacle(state, 'stool-3', 400, 1);
  const far = obstacle(state, 'desk-long', 700, 2);
  assert.equal(game.useSkill(), true);
  assert.equal(game.useSkill(), false);
  assert.equal(state.projectiles[0].y, CONFIG.ballRadius);
  game.update(0.3);
  assert.ok(!state.obstacles.includes(near));
  assert.ok(state.obstacles.includes(far));
  const destroyed = events.find((event) => event.type === 'destroy');
  assert.equal(destroyed.method, 'football');
  assert.equal(destroyed.obstacle.count, 3);
  assert.equal(game.useSkill(), true);
});

test('ground-level football destroys low and high stools in every group size, including airborne shots', () => {
  for (const airborne of [false, true]) {
    for (const height of [STOOL_DIMENSIONS.lowHeight, STOOL_DIMENSIONS.highHeight]) {
      for (const count of [1, 2, 3]) {
        const { game, state, events } = runningGame();
        pickup(game, 'football');
        clearWorld(state);
        if (airborne) {
          game.jump();
          game.update(0.18);
          assert.ok(state.player.y > 100);
        }
        const target = obstacle(state, `stool-${count}`, 400, 9001);
        target.height = height;
        const far = obstacle(state, 'desk-long', 700, 9002);
        assert.equal(game.useSkill(), true);
        game.update(0.3);
        const destroyed = events.filter((event) => event.type === 'destroy');
        assert.equal(destroyed.length, 1, `${height}px stool group of ${count}, airborne=${airborne}`);
        assert.equal(destroyed[0].method, 'football');
        assert.equal(destroyed[0].obstacle.id, target.id);
        assert.equal(destroyed[0].obstacle.count, count);
        assert.ok(!state.obstacles.includes(target));
        assert.ok(state.obstacles.includes(far), 'one ball only clears the nearest group');
        assert.equal(state.projectiles.length, 0);
      }
    }
  }
});

for (const cat of ['guoguo', 'keke', 'otter']) {
  test(`${cat} clears one whole nearest group, keeps jumping separate, and obeys range`, () => {
    const { game, state, events } = runningGame();
    pickup(game, cat);
    const behind = obstacle(state, 'stool-1', 70, 1);
    const near = obstacle(state, 'stool-3', 400, 2);
    const far = obstacle(state, 'desk-long', 650, 3);
    const outside = obstacle(state, 'desk-medium', 1000, 4);
    assert.equal(game.useSkill(), true);
    assert.equal(game.useSkill(), false);
    assert.ok(state.obstacles.includes(behind));
    assert.ok(!state.obstacles.includes(near));
    assert.ok(state.obstacles.includes(far));
    assert.ok(state.obstacles.includes(outside));
    assert.equal(state.player.onGround, true);
    const destroyed = events.find((event) => event.type === 'destroy');
    assert.equal(destroyed.method, 'cat');
    assert.equal(destroyed.cat, cat);
    assert.equal(destroyed.obstacle.count, 3);
    state.obstacles = [outside];
    game.update(0.6);
    outside.x = state.player.x + CONFIG.catRange + 1;
    game.useSkill();
    assert.ok(state.obstacles.includes(outside));
    assert.equal(game.jump(), true);
  });
}

test('star destroys collisions, refreshes, and provides one second of expiry protection', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'star');
  game.update(1);
  pickup(game, 'star');
  assert.equal(state.powers.star, 6);
  obstacle(state, 'desk-long', state.player.x);
  game.update(CONFIG.step);
  assert.equal(state.phase, 'running');
  assert.equal(events.find((event) => event.type === 'destroy').method, 'invincible');
  state.powers.star = CONFIG.step;
  game.update(CONFIG.step);
  assert.equal(state.powers.star, 0);
  assert.equal(state.powers.grace, 1);
  obstacle(state, 'desk-long', state.player.x);
  game.update(CONFIG.step);
  assert.equal(state.phase, 'running');
  clearWorld(state);
  game.update(1);
  assert.equal(state.powers.grace, 0);
  obstacle(state, 'desk-long', state.player.x);
  game.update(CONFIG.step);
  assert.equal(state.phase, 'falling');
});

test('bird pays exactly 400 extra points over eight active seconds', () => {
  const { game, state, events } = runningGame();
  state.powers.star = 100;
  pickup(game, 'bird');
  game.update(8);
  assert.ok(Math.abs(state.bonus - 400) < 1e-6);
  assert.equal(state.powers.bird, 0);
  assert.equal(state.score, Math.floor(state.distance / 12 + 400));
  assert.ok(events.some((event) => event.type === 'bonus'));
  assert.equal(events.filter((event) => event.type === 'power-expire' && event.power === 'bird').length, 1);
});

test('independent powers stack while skills replace and refresh without adding durations', () => {
  const { game, state } = runningGame();
  pickup(game, 'star');
  pickup(game, 'bird');
  pickup(game, 'football');
  assert.ok(state.powers.star > 5.9);
  assert.ok(state.powers.bird > 7.9);
  assert.equal(state.powers.skill, 'football');
  game.useSkill();
  assert.ok(state.cooldown > 0);
  pickup(game, 'guoguo');
  assert.equal(state.powers.skill, 'guoguo');
  assert.equal(state.powers.skillTime, 10);
  assert.equal(state.cooldown, 0);
  game.update(0.5);
  pickup(game, 'guoguo');
  assert.equal(state.powers.skillTime, 10);
  pickup(game, 'keke');
  assert.equal(state.powers.skill, 'keke');
  assert.equal(state.powers.skillTime, 10);
  assert.ok(state.powers.star > 0);
  assert.ok(state.powers.bird > 0);
});

test('a projectile survives skill expiry and expired useSkill never becomes jump', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'football');
  game.useSkill();
  const ball = state.projectiles[0];
  state.powers.skillTime = CONFIG.step;
  game.update(CONFIG.step);
  assert.equal(state.powers.skill, null);
  assert.equal(state.powers.grace, 1);
  assert.ok(state.projectiles.includes(ball));
  assert.equal(events.at(-1).type, 'power-expire');
  assert.equal(events.at(-1).power, 'football');
  assert.equal(game.useSkill(), false);
  assert.equal(state.player.onGround, true);
  assert.equal(game.jump(), true);
});

test('pause freezes every clock, effect and motion, preserving the original phase', () => {
  const { game, state } = runningGame();
  pickup(game, 'star');
  pickup(game, 'bird');
  pickup(game, 'football');
  game.useSkill();
  game.pause();
  const frozen = structuredClone(state);
  game.update(12);
  assert.deepEqual(state, frozen);
  assert.equal(game.jump(), false);
  assert.equal(game.useSkill(), false);
  game.resume();
  assert.equal(state.phase, 'running');
  game.update(0.1);
  assert.ok(state.powers.bird < frozen.powers.bird);
  game.start();
  game.pause();
  game.update(10);
  game.resume();
  assert.equal(state.phase, 'launch');
  game.update(CONFIG.launchSeconds);
  assert.equal(state.phase, 'running');
});

test('restart clears every run state while preserving the public state reference', () => {
  const { game, state } = runningGame();
  pickup(game, 'star');
  pickup(game, 'bird');
  pickup(game, 'football');
  pickup(game, 'flight');
  pickup(game, 'reminder');
  state.reminderCue = 0.5;
  state.reminderTargetId = 123;
  game.useSkill();
  obstacle(state);
  game.pause();
  game.start();
  assert.equal(game.state, state);
  assert.equal(state.phase, 'launch');
  assert.equal(state.pausedFrom, null);
  for (const field of ['time', 'distance', 'score', 'bonus', 'cooldown']) assert.equal(state[field], 0);
  assert.deepEqual(state.obstacles, []);
  assert.deepEqual(state.pickups, []);
  assert.deepEqual(state.projectiles, []);
  assert.deepEqual(state.powers, { star: 0, bird: 0, skill: null, skillTime: 0, grace: 0, movement: null, movementTime: 0, reminders: 0 });
  assert.equal(state.reminderCue, 0);
  assert.equal(state.reminderTargetId, null);
  assert.deepEqual(state.player, { x: CONFIG.playerX, y: 0, vy: 0, onGround: true, jumpsUsed: 0, flying: false, landing: false });
});

test('both airborne pickup heights require jumping and are reachable with the lower jump arc', () => {
  for (const height of [240, 285]) {
    const { game, state, events } = runningGame();
    const star = { id: 7000, type: 'star', x: state.player.x, y: height, r: 25 };
    state.pickups.push(star);
    game.update(0.1);
    assert.equal(state.powers.star, 0, `${height}px star cannot be collected from the ground`);
    assert.ok(state.pickups.includes(star));
    star.x = state.player.x + 80;
    game.jump();
    game.update(0.3);
    assert.ok(state.powers.star > 5.7, `${height}px star remains inside a normal jump's reach`);
    assert.ok(!state.pickups.includes(star));
    assert.equal(events.filter((event) => event.type === 'pickup').length, 1);
  }
});

test('120Hz simulation is identical under 30fps, 144fps and uneven frame pacing', () => {
  function simulate(frameDurations) {
    const { game, state, events } = runningGame();
    state.powers.star = 100;
    state.powers.bird = 8;
    let elapsed = 0;
    let accumulator = 0;
    let frame = 0;
    let physicsSteps = 0;
    while (elapsed < 6 - 1e-10) {
      const frameTime = Math.min(frameDurations[frame % frameDurations.length], 6 - elapsed);
      elapsed += frameTime;
      accumulator += frameTime;
      frame += 1;
      while (accumulator + 1e-10 >= CONFIG.step) {
        if ([0, 144, 384].includes(physicsSteps)) game.jump();
        game.update(CONFIG.step);
        accumulator -= CONFIG.step;
        physicsSteps += 1;
      }
    }
    assert.equal(physicsSteps, 720);
    assert.equal(state.phase, 'running');
    return { state, events };
  }
  const baseline = simulate([1 / 30]);
  assert.deepEqual(simulate([1 / 144]), baseline);
  assert.deepEqual(simulate([0.009, 0.041, 0.014, 0.023]), baseline);
});

test('generated furniture includes six shapes and two stores, no chairs, and no third consecutive type', () => {
  const { game } = runningGame(seededRandom(43));
  const { obstacles } = observeRun(game, 120);
  assert.deepEqual(Object.keys(OBSTACLES).sort(), ['desk', 'stool', 'store']);
  assert.deepEqual([...new Set(obstacles.filter((item) => item.type === 'stool').map((item) => item.count))].sort(), [1, 2, 3]);
  assert.deepEqual([...new Set(obstacles.filter((item) => item.type === 'desk').map((item) => item.variant))].sort(), ['long', 'medium', 'short']);
  assert.deepEqual([...new Set(obstacles.filter((item) => item.type === 'desk').map((item) => item.width))].sort((a, b) => a - b), [80, 126, 150]);
  assert.deepEqual([...new Set(obstacles.filter((item) => item.type === 'store').map((item) => item.storeVariant))].sort(), [1, 2]);
  for (let index = 0; index < obstacles.length; index += 1) {
    const item = obstacles[index];
    assert.ok(['stool', 'desk', 'store'].includes(item.type));
    if (item.type === 'stool') {
      assert.equal(item.width, item.count * STOOL_DIMENSIONS.width + (item.count - 1) * STOOL_DIMENSIONS.gap);
      assert.ok([STOOL_DIMENSIONS.lowHeight, STOOL_DIMENSIONS.highHeight].includes(item.height));
    } else assert.equal(item.height, 90);
    if (item.type === 'store') {
      assert.ok([1, 2].includes(item.storeVariant));
      assert.equal(item.width, 126);
      assert.equal(item.height, 90);
    }
    if (index > 1) assert.ok(!(item.type === obstacles[index - 1].type && item.type === obstacles[index - 2].type));
  }
});

test('after opening acceleration, wide combinations unlock around 20 and 40 seconds and speed caps at 50 seconds', () => {
  const keysAt = (seconds) => allowedObstacleVariants(CONFIG.startSpeed + 3 * seconds).map((item) => item.key);
  assert.deepEqual(keysAt(0), ['stool-1', 'stool-2', 'desk-short']);
  assert.ok(!keysAt(19.9).includes('stool-3'));
  assert.ok(!keysAt(19.9).includes('desk-medium'));
  assert.ok(!keysAt(20).includes('stool-3'));
  assert.ok(keysAt(20).includes('desk-medium'));
  assert.ok(!keysAt(39.9).includes('desk-long'));
  assert.ok(!keysAt(39.9).includes('stool-3'));
  assert.ok(keysAt(40).includes('desk-long'));
  assert.ok(keysAt(40).includes('stool-3'));
  const { game, state } = runningGame(seededRandom(43));
  const { obstacles } = observeRun(game, 55);
  assert.equal(state.speed, CONFIG.maxSpeed);
  for (const [index, item] of obstacles.entries()) {
    const variant = OBSTACLE_VARIANTS.find((entry) => (
      entry.type === item.type && (item.type === 'stool' ? entry.count === item.count : item.type === 'desk' ? entry.variant === item.variant : true)
    ));
    const arrivalSpeed = index === 0 ? CONFIG.startSpeed : item.speed;
    assert.ok(arrivalSpeed + 1e-6 >= variant.minSpeed);
    assert.ok((item.width + CONFIG.playerWidth) / arrivalSpeed <= jumpClearanceWindow(item.height) - CONFIG.minJumpWindow);
  }
  const maximumHalfWidth = Math.max(...OBSTACLE_VARIANTS.map((item) => item.width)) / 2;
  assert.ok((CONFIG.width - CONFIG.playerX - CONFIG.playerWidth / 2 - maximumHalfWidth) / CONFIG.maxSpeed >= 1, 'at least one second of visible warning at full speed');
});

test('seeded runs reproduce while different seeds and successive default-random starts differ', () => {
  const first = observeRun(runningGame(seededRandom(101)).game, 35);
  assert.deepEqual(observeRun(runningGame(seededRandom(101)).game, 35), first);
  assert.notDeepEqual(observeRun(runningGame(seededRandom(102)).game, 35), first);
  const realRandom = Math.random;
  let game;
  try {
    Math.random = seededRandom(305);
    game = createGame();
  } finally {
    Math.random = realRandom;
  }
  game.start();
  game.update(CONFIG.launchSeconds);
  const opening = observeRun(game, 15);
  game.start();
  game.update(CONFIG.launchSeconds);
  assert.notDeepEqual(observeRun(game, 15), opening, 'start must continue fresh randomness rather than resetting a seed');
});

test('random gaps are denser, varied, and still permit landing plus another press between groups', () => {
  const { game } = runningGame(seededRandom(73));
  const { obstacles } = observeRun(game, 90);
  assert.ok(obstacles[0].time <= CONFIG.step + 1e-6);
  assert.equal(obstacles[0].x, CONFIG.openingSpawnX);
  assert.ok(obstacles[1].time >= CONFIG.accelerationSeconds);
  const rhythm = new Set();
  const flightTime = (2 * CONFIG.jumpV) / CONFIG.gravity;
  for (let index = 1; index < obstacles.length; index += 1) {
    const previous = obstacles[index - 1];
    const next = obstacles[index];
    const gap = next.distance - previous.distance;
    const minimum = safeObstacleGap(previous.speed, 0, previous.width, next.width);
    assert.ok(gap + 0.01 >= minimum, 'centre spacing must account for both group widths');
    const secondsBetweenCentres = gap / Math.min(CONFIG.maxSpeed, previous.speed + 4.5);
    assert.ok(secondsBetweenCentres >= flightTime + 0.16 - 0.001);
    rhythm.add(Math.round(gap / previous.speed * 10));
  }
  assert.ok(rhythm.size >= 4, 'obstacles should not arrive on a fixed beat');
  const average = obstacles.slice(1).reduce((sum, item, index) => sum + item.time - obstacles[index].time, 0) / (obstacles.length - 1);
  assert.ok(average < 1.5, `average interval ${average.toFixed(2)}s should be substantially denser`);
});

test('power scheduling is random and sparse, prevents consecutive repeats and never embeds cats in furniture', () => {
  const { game, state } = runningGame(seededRandom(93));
  const seen = new Set();
  const schedule = [];
  state.powers.star = 1000;
  for (let index = 0; index < 180 * 120; index += 1) {
    game.update(CONFIG.step);
    for (const item of state.pickups) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        schedule.push({ type: item.type, time: state.time - CONFIG.launchSeconds });
      }
      if (item.y > 100) continue;
      for (const furniture of state.obstacles) assert.ok(Math.abs(item.x - furniture.x) > furniture.width / 2 + item.r);
    }
  }
  assert.ok(schedule[0].time >= 6 && schedule[0].time <= 10.01);
  for (let index = 1; index < schedule.length; index += 1) {
    const gap = schedule[index].time - schedule[index - 1].time;
    assert.ok(gap >= 8 - 1e-6 && gap <= 13.01);
    assert.notEqual(schedule[index].type, schedule[index - 1].type);
  }
  assert.ok(new Set(schedule.map((item) => item.type)).size >= 4);
});

test('even constant random rolls cannot repeat pickups or place swallow pets consecutively', () => {
  const pets = new Set(['guoguo', 'keke', 'otter']);
  for (const value of [0, 0.3, 0.49, 0.59, 0.7, 0.999999]) {
    const { pickups } = observeRun(runningGame(() => value).game, 120);
    assert.ok(pickups.length >= 8);
    for (let index = 1; index < pickups.length; index += 1) {
      assert.notEqual(pickups[index].type, pickups[index - 1].type);
      assert.ok(!(pets.has(pickups[index].type) && pets.has(pickups[index - 1].type)));
    }
  }
});

test('first swallow pet is always guoguo, pets are separated and guoguo remains more common among pets', () => {
  const pets = new Set(['guoguo', 'keke', 'otter']);
  const counts = {};
  let total = 0;
  let sawNonPetOpening = false;
  for (let seed = 300; seed < 324; seed += 1) {
    const { pickups } = observeRun(runningGame(seededRandom(seed)).game, 600);
    const firstPetIndex = pickups.findIndex((item) => pets.has(item.type));
    assert.ok(firstPetIndex >= 0);
    assert.equal(pickups[firstPetIndex].type, 'guoguo');
    if (firstPetIndex > 0) sawNonPetOpening = true;
    for (const [index, item] of pickups.entries()) {
      counts[item.type] = (counts[item.type] || 0) + 1;
      total += 1;
      if (index > 0) {
        assert.notEqual(item.type, pickups[index - 1].type);
        assert.ok(!(pets.has(item.type) && pets.has(pickups[index - 1].type)));
      }
    }
  }
  assert.equal(Object.keys(counts).length, 10);
  assert.ok(sawNonPetOpening, 'the first overall pickup does not have to be a pet');
  assert.ok(counts.guoguo / total > 0.12 && counts.guoguo / total < 0.18);
  for (const [type, count] of Object.entries(counts)) {
    if (type === 'guoguo') continue;
    assert.ok(count / total > 0.045 && count / total < 0.13, `${type} must remain available`);
    if (pets.has(type)) assert.ok(counts.guoguo > count * 1.5, `guoguo should appear more often than ${type}`);
  }
});

test('restarting clears pickup exclusions and restores the first-guoguo guarantee', () => {
  const { game } = runningGame(() => 0.59);
  const first = observeRun(game, 35).pickups;
  assert.ok(first.length >= 3);
  assert.equal(first[0].type, 'guoguo');
  assert.ok(first.some((item) => item.type === 'keke'));
  game.start();
  game.update(CONFIG.launchSeconds);
  const retry = observeRun(game, 8.4).pickups;
  assert.equal(retry.length, 1);
  assert.equal(retry[0].type, first[0].type);
});

test('removed groups and offscreen objects cannot produce duplicate damage or effects', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'guoguo');
  clearWorld(state);
  const removed = obstacle(state, 'stool-3', 350, 1);
  game.useSkill();
  removed.x = state.player.x;
  obstacle(state, 'desk-long', -200, 2);
  state.projectiles.push({ id: 3, x: CONFIG.width + 200, y: 75, vx: 1000 });
  state.pickups.push({ id: 4, type: 'star', x: -200, y: 285, r: 25 });
  game.update(1);
  assert.equal(state.phase, 'running');
  assert.equal(events.filter((event) => event.type === 'destroy').length, 1);
  assert.equal(events.filter((event) => event.type === 'hit').length, 0);
  assert.equal(state.obstacles.length, 0);
  assert.equal(state.projectiles.length, 0);
  assert.equal(state.pickups.length, 0);
});

test('opening edge gaps stay generous for twelve seconds and narrow continuously until forty seconds', () => {
  const speed = 350;
  const halfWidths = (92 + 80) / 2;
  for (const elapsed of [0, 6, 12]) {
    assert.ok(safeObstacleGap(speed, 0, 92, 80, elapsed) - halfWidths >= speed * 1.45);
  }
  let previous = safeObstacleGap(speed, 0, 92, 80, 12);
  for (let elapsed = 12.1; elapsed <= 40; elapsed += 0.1) {
    const gap = safeObstacleGap(speed, 0, 92, 80, elapsed);
    assert.ok(gap <= previous + 1e-8);
    assert.ok(previous - gap < 2, 'the ramp cannot change in a sudden step');
    previous = gap;
  }
  const { game } = runningGame(seededRandom(29));
  const { obstacles } = observeRun(game, 45);
  for (let index = 0; index < obstacles.length; index += 1) {
    const item = obstacles[index];
    if (item.time < 12) assert.ok(item.type === 'stool' ? item.count <= 2 : item.type === 'desk' && item.variant === 'short');
    if (index === 0) continue;
    const prior = obstacles[index - 1];
    const edgeGap = item.distance - prior.distance - (item.width + prior.width) / 2;
    if (prior.time < 12) assert.ok(edgeGap >= prior.speed * 1.45);
  }
  const quiet = runningGame();
  while (quiet.state.phase === 'running') quiet.game.update(CONFIG.step);
  assert.ok(quiet.state.time >= 4, 'the first collision leaves at least about four seconds to prepare');
});

test('stores are destroyed by football, all swallow skills, and invincibility', () => {
  for (const power of ['football', 'guoguo', 'keke', 'otter', 'star']) {
    const { game, state, events } = runningGame();
    pickup(game, power);
    const store = obstacle(state, 'store', power === 'star' ? state.player.x : 400, 1);
    store.storeVariant = 2;
    if (power !== 'star') game.useSkill();
    game.update(0.3);
    assert.ok(!state.obstacles.includes(store));
    const event = events.find((item) => item.type === 'destroy');
    assert.equal(event.obstacle.type, 'store');
    assert.equal(event.obstacle.storeVariant, 2);
  }
});

test('high jump rises further than normal and respects a viewport ceiling without losing that advantage', () => {
  const normal = runningGame();
  normal.game.jump();
  normal.game.update(CONFIG.jumpV / CONFIG.gravity);
  const normalPeak = normal.state.player.y;
  const high = runningGame();
  pickup(high.game, 'high');
  high.game.jump();
  high.game.update(CONFIG.jumpV * CONFIG.highMultiplier / CONFIG.gravity);
  assert.ok(high.state.player.y > normalPeak * 1.5);
  assert.ok(high.state.player.y < 320);
  const limited = runningGame();
  assert.equal(limited.game.setFlightCeiling(100), 220);
  pickup(limited.game, 'high');
  limited.game.jump();
  let limitedPeak = 0;
  for (let step = 0; step < 60; step += 1) {
    limited.game.update(CONFIG.step);
    limitedPeak = Math.max(limitedPeak, limited.state.player.y);
  }
  assert.ok(limitedPeak <= 220);
  assert.ok(limitedPeak > normalPeak);
});

test('double jump allows exactly one airborne repeat, lengthens airtime, and resets on landing', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'double');
  game.jump();
  game.update(0.28);
  assert.equal(state.player.jumpsUsed, 1);
  assert.equal(game.jump(), true);
  assert.equal(state.player.jumpsUsed, 2);
  assert.equal(game.jump(), false);
  let airtime = 0.28;
  while (!state.player.onGround) {
    game.update(CONFIG.step);
    airtime += CONFIG.step;
  }
  assert.ok(airtime > (2 * CONFIG.jumpV / CONFIG.gravity) * 1.3);
  assert.equal(events.filter((item) => item.type === 'jump' && item.double).length, 1);
  assert.equal(state.player.jumpsUsed, 0);
  assert.equal(game.jump(), true);
  assert.equal(state.player.jumpsUsed, 1);
});

test('flight can repeatedly lift, descend, and lift again while obeying the current ceiling', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'flight');
  assert.equal(state.player.flying, true);
  assert.equal(state.player.vy, 420);
  game.update(0.5);
  const firstHeight = state.player.y;
  assert.ok(firstHeight > 100);
  game.jump();
  assert.equal(state.player.vy, CONFIG.flightLift);
  game.update(0.5);
  assert.ok(state.player.y > firstHeight);
  game.setFlightCeiling(250);
  assert.ok(state.player.y <= 250);
  const upper = state.player.y;
  game.update(0.5);
  assert.ok(state.player.y < upper);
  game.jump();
  game.update(0.3);
  assert.ok(state.player.y <= 250);
  assert.ok(state.player.vy >= -CONFIG.flightFallSpeed);
  assert.ok(events.filter((item) => item.type === 'flight-lift').length >= 3);
});

test('expired flight forces a protected smooth landing and pressing jump cannot extend it', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'flight');
  game.update(0.8);
  game.jump();
  game.update(0.4);
  state.powers.movementTime = CONFIG.step;
  game.update(CONFIG.step);
  assert.equal(state.powers.movement, null);
  assert.equal(state.player.landing, true);
  assert.equal(state.player.flying, true);
  let previousHeight = state.player.y;
  let steps = 0;
  while (state.player.landing && steps < 600) {
    assert.equal(game.jump(), false);
    game.update(CONFIG.step);
    assert.ok(state.player.y <= previousHeight);
    assert.ok(state.player.y >= 0);
    assert.ok(previousHeight - state.player.y <= CONFIG.landingFallSpeed * CONFIG.step + 0.1);
    previousHeight = state.player.y;
    steps += 1;
  }
  assert.ok(steps < 600);
  assert.equal(state.phase, 'running');
  assert.equal(state.player.y, 0);
  assert.equal(state.player.flying, false);
  assert.equal(state.player.landing, false);
  assert.equal(state.powers.grace, 1);
  assert.equal(events.filter((item) => item.type === 'flight-land').length, 1);
  assert.equal(events.filter((item) => item.type === 'power-expire' && item.power === 'flight').length, 1);
});

test('replacing flight settles first, preserves the new power duration, and pauses every new field', () => {
  const { game, state } = runningGame();
  pickup(game, 'flight');
  game.update(0.5);
  pickup(game, 'high');
  assert.equal(state.powers.movement, 'high');
  assert.equal(state.player.landing, true);
  assert.equal(state.powers.movementTime, 10);
  game.pause();
  const frozen = structuredClone(state);
  game.update(8);
  assert.deepEqual(state, frozen);
  game.resume();
  for (let index = 0; state.player.landing && index < 600; index += 1) game.update(CONFIG.step);
  assert.equal(state.player.landing, false);
  assert.equal(state.powers.movementTime, 10);
  game.update(0.2);
  assert.ok(state.powers.movementTime < 9.81);
  assert.ok(state.powers.movementTime > 9.79);
  game.jump();
  assert.equal(state.player.vy, CONFIG.jumpV * CONFIG.highMultiplier);
});

test('movement powers replace each other and high/double expiry restores the ordinary jump', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'high');
  pickup(game, 'double');
  assert.equal(state.powers.movement, 'double');
  assert.equal(state.powers.movementTime, 10);
  state.powers.movementTime = CONFIG.step;
  game.update(CONFIG.step);
  assert.equal(state.powers.movement, null);
  assert.equal(state.powers.grace, 1);
  assert.ok(events.some((item) => item.type === 'power-expire' && item.power === 'double'));
  game.jump();
  assert.equal(state.player.vy, CONFIG.jumpV);
  assert.equal(game.jump(), false);
});

test('generated stars and birds fly along their own visible and normally reachable paths', () => {
  const { game, state } = runningGame(() => 0);
  state.powers.star = 1000;
  game.update(6.01);
  const star = state.pickups.find((item) => item.type === 'star');
  assert.ok(star.flightPath);
  const before = { x: star.x, y: star.y, age: star.age, distance: state.distance };
  game.update(0.25);
  assert.ok(Math.abs(star.x - (before.x - (state.distance - before.distance) + star.vx * 0.25)) < 1e-6);
  assert.ok(star.y < before.y);
  assert.ok(Math.abs(star.age - before.age - 0.25) < 1e-6);
  game.update(7.8);
  const bird = state.pickups.find((item) => item.type === 'bird');
  assert.ok(bird.flightPath);
  const birdY = bird.y;
  game.update(0.2);
  assert.notEqual(bird.y, birdY);
  assert.ok(bird.y >= 300 && bird.y <= 320);
  for (const item of [star, bird]) {
    assert.ok(item.vx <= -90 && item.vx >= -140);
    assert.ok((CONFIG.width - CONFIG.playerX - CONFIG.playerWidth / 2 - item.r) / (CONFIG.maxSpeed - item.vx) > 0.8);
  }
});

test('flying pickup collision and pickup events use the actual updated position', () => {
  for (const type of ['star', 'bird']) {
    const { game, state, events } = runningGame();
    const item = { id: 100, type, x: state.player.x + 120, y: 315, r: 25, flightPath: true, vx: -120, vy: -25, age: 0, baseY: 315 };
    state.pickups.push(item);
    game.jump();
    game.update(0.35);
    const event = events.find((entry) => entry.type === 'pickup');
    assert.ok(event, `${type} is reachable with a normal jump`);
    assert.equal(event.pickupType, type);
    assert.equal(event.x, item.x);
    assert.equal(event.y, item.y);
    assert.ok(!state.pickups.includes(item));
    assert.ok(item.x < state.player.x + 120);
  }
});

test('reminder cues exactly six distinct obstacles and each immediate jump actually succeeds', () => {
  const { game, state, events } = runningGame(seededRandom(51));
  pickup(game, 'reminder');
  game.update(0.5);
  assert.equal(state.powers.reminders, 6, 'empty space cannot consume a reminder');
  const used = new Set();
  let handled = 0;
  for (let frame = 0; frame < 20 * 120 && state.phase === 'running'; frame += 1) {
    state.pickups = [];
    game.update(CONFIG.step);
    const cues = events.filter((item) => item.type === 'jump-cue');
    if (cues.length > handled) {
      const cue = cues.at(-1);
      assert.ok(!used.has(cue.obstacleId));
      used.add(cue.obstacleId);
      const target = state.obstacles.find((item) => item.id === cue.obstacleId);
      assert.notEqual(findSafeJumpDelay(state.player, target, state.speed, CONFIG.jumpV, 560, CONFIG.reminderLead), null);
      assert.equal(game.jump(), true);
      assert.ok(state.reminderCue > 0.6);
      handled = cues.length;
    }
    if (handled === 6 && events.filter((item) => item.type === 'jump').length >= 6 && state.player.onGround) break;
  }
  assert.equal(handled, 6);
  assert.equal(used.size, 6);
  assert.equal(state.powers.reminders, 0);
  assert.equal(state.phase, 'running');
  assert.equal(events.filter((item) => item.type === 'hit').length, 0);
  game.update(0.05);
  assert.equal(events.filter((item) => item.type === 'jump-cue').length, 6);
  clearWorld(state);
  pickup(game, 'reminder');
  assert.equal(state.powers.reminders, 6);
  pickup(game, 'reminder');
  assert.equal(state.powers.reminders, 6, 'another pickup refreshes six charges rather than adding six more');
});

test('reminder prediction uses high-jump physics and never consumes charges while already flying', () => {
  const { game, state, events } = runningGame();
  pickup(game, 'high');
  pickup(game, 'reminder');
  const target = obstacle(state, 'desk-long', state.player.x + 350, 777);
  let triggered = false;
  for (let index = 0; index < 180; index += 1) {
    game.update(CONFIG.step);
    if (events.some((item) => item.type === 'jump-cue')) {
      assert.notEqual(findSafeJumpDelay(state.player, target, state.speed, CONFIG.jumpV * CONFIG.highMultiplier, 560, CONFIG.reminderLead), null);
      game.jump();
      triggered = true;
      break;
    }
  }
  assert.equal(triggered, true);
  game.update(1.5);
  assert.equal(state.phase, 'running');
  const airborne = runningGame();
  pickup(airborne.game, 'reminder');
  pickup(airborne.game, 'flight');
  obstacle(airborne.state, 'stool-1', 400);
  airborne.game.update(0.5);
  assert.equal(airborne.state.powers.reminders, 6);
  assert.equal(airborne.events.filter((item) => item.type === 'jump-cue').length, 0);
});

function prepareReminderTarget(speed, key) {
  const context = runningGame(seededRandom(177));
  const { game, state, events } = context;
  advanceToSpeed(game, speed);
  pickup(game, 'reminder');
  const target = obstacle(state, key, state.player.x + speed * 1.15, 77777);
  function advance(seconds) {
    for (let remaining = seconds; remaining > 1e-8; remaining -= CONFIG.step) {
      // Keep this physical scenario about its target, excluding unrelated random spawns.
      state.obstacles = state.obstacles.filter((item) => item.id === target.id);
      state.pickups = [];
      game.update(Math.min(CONFIG.step, remaining));
    }
  }
  for (let index = 0; index < 180 && !events.some((item) => item.type === 'jump-cue'); index += 1) advance(CONFIG.step);
  const cue = events.find((item) => item.type === 'jump-cue');
  assert.equal(cue?.obstacleId, target.id);
  assert.equal(events.filter((item) => item.type === 'jump').length, 0);
  assert.equal(state.player.onGround, true);
  return { ...context, target, advance };
}

test('reminder accepts immediate through 250ms human responses plus 50ms UI delay at all required speeds', () => {
  for (const [speed, key] of [[300, 'desk-short'], [421.5, 'desk-long'], [450, 'desk-long']]) {
    for (const response of [0, 0.1, 0.2, 0.25]) {
      for (const uiDelay of [0, 0.05]) {
        const { game, state, events, target, advance } = prepareReminderTarget(speed, key);
        advance(response + uiDelay);
        assert.equal(game.jump(), true);
        advance(1.2);
        assert.equal(state.phase, 'running', `${key}/${speed}, response ${response}s + UI ${uiDelay}s must pass`);
        assert.ok(target.x + target.width / 2 < state.player.x - CONFIG.playerWidth / 2);
        assert.equal(events.filter((item) => item.type === 'jump').length, 1, 'one press produces one normal jump');
        assert.equal(events.filter((item) => item.type === 'hit').length, 0);
      }
    }
  }
});

test('early reminder input waits for a real safe window, while no input never auto-jumps', () => {
  const buffered = prepareReminderTarget(450, 'desk-long');
  assert.equal(canJumpObstacleNow(buffered.state.player, buffered.target, buffered.state.speed), false);
  assert.equal(buffered.game.jump(), true);
  assert.equal(buffered.state.player.onGround, true, 'an early press must be buffered rather than jump too early');
  assert.equal(buffered.events.filter((item) => item.type === 'jump').length, 0);
  buffered.advance(0.2);
  assert.equal(buffered.events.filter((item) => item.type === 'jump').length, 0);
  buffered.advance(0.12);
  assert.equal(buffered.events.filter((item) => item.type === 'jump').length, 1);
  assert.equal(buffered.state.player.onGround, false);
  buffered.advance(0.9);
  assert.equal(buffered.state.phase, 'running');

  const ignored = prepareReminderTarget(450, 'desk-long');
  ignored.advance(1);
  assert.equal(ignored.events.filter((item) => item.type === 'jump').length, 0);
  assert.equal(ignored.state.phase, 'falling', 'the reminder itself never presses jump for the player');
});

test('pending reminder inputs are cancelled by pause, restart, power changes and target destruction', () => {
  for (const cancellation of ['pause', 'restart', 'high', 'flight', 'destroy']) {
    const { game, state, events, advance } = prepareReminderTarget(450, 'desk-long');
    game.jump();
    if (cancellation === 'pause') {
      game.pause();
      game.update(1);
      game.resume();
    } else if (cancellation === 'restart') {
      game.start();
    } else if (cancellation === 'destroy') {
      pickup(game, 'otter');
      game.useSkill();
    } else pickup(game, cancellation);
    advance(0.35);
    assert.equal(events.filter((item) => item.type === 'jump').length, 0, `${cancellation} cannot preserve an old buffered jump`);
    if (cancellation === 'flight') assert.equal(state.player.flying, true);
    else assert.equal(state.player.onGround, true);
  }
});
