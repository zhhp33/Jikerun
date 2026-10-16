/** World coordinates use x at an object's centre and y as height above the road. */
export const CONFIG = Object.freeze({
  width: 720,
  height: 1120,
  ground: 874,
  playerX: 145,
  playerWidth: 54,
  playerHeight: 148,
  jumpV: 920,
  gravity: 2200,
  minJumpWindow: 0.10,
  reminderLead: 0.25,
  reminderCharges: 6,
  startSpeed: 300,
  kickoffSpeed: 120,
  accelerationSeconds: 3,
  openingSpawnX: 900,
  maxSpeed: 450,
  rampSeconds: 50,
  launchSeconds: 1.2,
  fallSeconds: 1.65,
  starSeconds: 6,
  birdSeconds: 8,
  skillSeconds: 10,
  movementSeconds: 10,
  highMultiplier: 1.28,
  flightLift: 430,
  flightGravity: 430,
  flightFallSpeed: 220,
  landingFallSpeed: 170,
  graceSeconds: 1,
  footballCooldown: 0.3,
  catCooldown: 0.6,
  catRange: 650,
  ballSpeed: 1000,
  ballRadius: 20,
  spawnX: 800,
  step: 1 / 120,
});

export const STOOL_DIMENSIONS = Object.freeze({ width: 42, gap: 8, lowHeight: 48, highHeight: 64 });

export const OBSTACLES = Object.freeze({
  stool: Object.freeze({ width: STOOL_DIMENSIONS.width, height: STOOL_DIMENSIONS.highHeight, count: 1 }),
  desk: Object.freeze({ width: 80, height: 90, variant: 'short' }),
  store: Object.freeze({ width: 126, height: 90, storeVariant: 1 }),
});

export const OBSTACLE_VARIANTS = Object.freeze([
  { key: 'stool-1', type: 'stool', count: 1, width: STOOL_DIMENSIONS.width, height: STOOL_DIMENSIONS.highHeight, minSpeed: 300 },
  { key: 'stool-2', type: 'stool', count: 2, width: STOOL_DIMENSIONS.width * 2 + STOOL_DIMENSIONS.gap, height: STOOL_DIMENSIONS.highHeight, minSpeed: 300 },
  { key: 'stool-3', type: 'stool', count: 3, width: STOOL_DIMENSIONS.width * 3 + STOOL_DIMENSIONS.gap * 2, height: STOOL_DIMENSIONS.highHeight, minSpeed: 420 },
  { key: 'desk-short', type: 'desk', variant: 'short', width: 80, height: 90, minSpeed: 300 },
  { key: 'desk-medium', type: 'desk', variant: 'medium', width: 126, height: 90, minSpeed: 360 },
  { key: 'desk-long', type: 'desk', variant: 'long', width: 150, height: 90, minSpeed: 420 },
  { key: 'store', type: 'store', width: 126, height: 90, minSpeed: 420 },
].map(Object.freeze));

const EPSILON = 1e-8;
const PICKUP_WEIGHTS = Object.freeze({
  star: 1, bird: 1, football: 1, guoguo: 2, keke: 1,
  otter: 1, high: 1, double: 1, flight: 1, reminder: 1,
});
const CAT_TYPES = ['guoguo', 'keke', 'otter'];
const MOVEMENT_TYPES = ['high', 'double', 'flight'];

export function freshState() {
  return {
    phase: 'ready',
    pausedFrom: null,
    phaseTime: 0,
    time: 0,
    distance: 0,
    score: 0,
    bonus: 0,
    speed: CONFIG.kickoffSpeed,
    runTime: 0,
    player: { x: CONFIG.playerX, y: 0, vy: 0, onGround: true, jumpsUsed: 0, flying: false, landing: false },
    obstacles: [],
    pickups: [],
    projectiles: [],
    powers: { star: 0, bird: 0, skill: null, skillTime: 0, grace: 0, movement: null, movementTime: 0, reminders: 0 },
    cooldown: 0,
    reminderCue: 0,
    reminderTargetId: null,
  };
}

export function jumpClearanceWindow(height) {
  return (2 * Math.sqrt(Math.max(0, CONFIG.jumpV ** 2 - 2 * CONFIG.gravity * (height - 12)))) / CONFIG.gravity;
}

/** The first three playable seconds accelerate from the kick into the usual run. */
export function worldSpeedAt(time) {
  const t = Math.max(0, time);
  if (t < CONFIG.accelerationSeconds) {
    const u = t / CONFIG.accelerationSeconds;
    return CONFIG.kickoffSpeed + (CONFIG.startSpeed - CONFIG.kickoffSpeed) * u * u * (3 - 2 * u);
  }
  return Math.min(CONFIG.maxSpeed, CONFIG.startSpeed
    + (CONFIG.maxSpeed - CONFIG.startSpeed) * (t - CONFIG.accelerationSeconds) / CONFIG.rampSeconds);
}

export function worldDistanceAt(time) {
  const t = Math.max(0, time), duration = CONFIG.accelerationSeconds;
  const opening = Math.min(t, duration), u = opening / duration;
  const distance = CONFIG.kickoffSpeed * opening
    + (CONFIG.startSpeed - CONFIG.kickoffSpeed) * duration * (u ** 3 - .5 * u ** 4);
  const normal = Math.max(0, t - duration), ramp = Math.min(normal, CONFIG.rampSeconds);
  const acceleration = (CONFIG.maxSpeed - CONFIG.startSpeed) / CONFIG.rampSeconds;
  return distance + CONFIG.startSpeed * ramp + .5 * acceleration * ramp * ramp
    + CONFIG.maxSpeed * Math.max(0, normal - ramp);
}

function timeAtSpeed(speed) {
  if (speed >= CONFIG.startSpeed) return CONFIG.accelerationSeconds
    + (Math.min(CONFIG.maxSpeed, speed) - CONFIG.startSpeed) * CONFIG.rampSeconds / (CONFIG.maxSpeed - CONFIG.startSpeed);
  let low = 0, high = CONFIG.accelerationSeconds;
  for (let index = 0; index < 36; index++) {
    const mid = (low + high) / 2;
    if (worldSpeedAt(mid) < speed) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function allowedObstacleVariants(speed) {
  return OBSTACLE_VARIANTS.filter((item) => (
    speed + EPSILON >= item.minSpeed &&
    (item.width + CONFIG.playerWidth) / speed <= jumpClearanceWindow(item.height) - CONFIG.minJumpWindow
  ));
}

/** Centre spacing leaves a full flight plus 160ms on the road, with random rhythm. */
export function safeObstacleGap(speed, variation = 0, previousWidth = STOOL_DIMENSIONS.width, nextWidth = STOOL_DIMENSIONS.width, elapsed = 40) {
  speed = Math.max(CONFIG.startSpeed, speed);
  const acceleration = (CONFIG.maxSpeed - CONFIG.startSpeed) / CONFIG.rampSeconds;
  const anticipatedSpeed = Math.min(CONFIG.maxSpeed, speed + acceleration * 1.5);
  const flightTime = (2 * CONFIG.jumpV) / CONFIG.gravity;
  const progress = Math.max(0, Math.min(1, (elapsed - 12) / 28));
  const eased = progress * progress * (3 - 2 * progress);
  const edgeSeconds = 1.45 - 0.8 * eased;
  const minimum = Math.max(
    anticipatedSpeed * (flightTime + 0.16),
    (previousWidth + nextWidth) / 2 + anticipatedSpeed * edgeSeconds,
  );
  return minimum + Math.max(0, Math.min(1, variation)) * anticipatedSpeed * (0.24 + 0.21 * eased);
}

export function playerHitsObstacle(player, obstacle) {
  return (
    player.x + CONFIG.playerWidth / 2 > obstacle.x - obstacle.width / 2 &&
    player.x - CONFIG.playerWidth / 2 < obstacle.x + obstacle.width / 2 &&
    player.y + 12 < obstacle.height &&
    player.y + CONFIG.playerHeight > 0
  );
}

/** Predicts the same fixed-step collision path used by the live game, without mutation. */
export function canJumpObstacleNow(player, obstacle, speed, jumpVelocity = CONFIG.jumpV, ceiling = 560) {
  const rider = { ...player, y: 0, vy: jumpVelocity };
  const target = { ...obstacle };
  let motionTime = timeAtSpeed(speed);
  const maxTime = (2 * jumpVelocity) / CONFIG.gravity + 0.6;
  for (let time = 0; time < maxTime; time += CONFIG.step) {
    target.x -= worldDistanceAt(motionTime + CONFIG.step) - worldDistanceAt(motionTime);
    motionTime += CONFIG.step;
    rider.y += rider.vy * CONFIG.step - 0.5 * CONFIG.gravity * CONFIG.step ** 2;
    rider.vy -= CONFIG.gravity * CONFIG.step;
    if (rider.y > ceiling) {
      rider.y = ceiling;
      rider.vy = Math.min(0, rider.vy);
    }
    rider.y = Math.max(0, rider.y);
    if (playerHitsObstacle(rider, target)) return false;
    if (target.x + target.width / 2 < rider.x - CONFIG.playerWidth / 2) return true;
    if (rider.y === 0 && rider.vy < 0) return false;
  }
  return false;
}

/** Finds a real upcoming takeoff window, including acceleration and the viewport ceiling. */
export function findSafeJumpDelay(player, obstacle, speed, jumpVelocity = CONFIG.jumpV, ceiling = 560, horizon = 0.6) {
  const motionTime = timeAtSpeed(speed);
  for (let delay = 0; delay <= horizon + EPSILON; delay += CONFIG.step) {
    const travel = worldDistanceAt(motionTime + delay) - worldDistanceAt(motionTime);
    const futureTarget = { ...obstacle, x: obstacle.x - travel };
    const futureSpeed = worldSpeedAt(motionTime + delay);
    if (canJumpObstacleNow(player, futureTarget, futureSpeed, jumpVelocity, ceiling)) return delay;
  }
  return null;
}

function playerTouchesPickup(player, pickup) {
  const nearestX = Math.max(
    player.x - CONFIG.playerWidth / 2,
    Math.min(pickup.x, player.x + CONFIG.playerWidth / 2),
  );
  const nearestY = Math.max(
    player.y + 12,
    Math.min(pickup.y, player.y + CONFIG.playerHeight),
  );
  return (pickup.x - nearestX) ** 2 + (pickup.y - nearestY) ** 2 <= pickup.r ** 2;
}

export function createGame({ random = Math.random, onEvent = () => {} } = {}) {
  const state = freshState();
  let serial = 0;
  let runningTime = 0;
  let nextObstacleDistance = 0;
  let nextPickupTime = 0;
  let plannedObstacle = null;
  let obstacleHistory = [];
  let lastPickupType = null;
  let hasSpawnedCat = false;
  let coinTimer = 0;
  let flightCeiling = 560;
  let remindedObstacles = new Set();
  let bufferedJump = null;
  let openingObstaclePending = true;

  const emit = (type, values = {}) => onEvent({ type, ...values });
  const roll = () => Math.max(0, Math.min(0.999999, Number(random()) || 0));

  function chooseObstacle(speed) {
    let candidates = allowedObstacleVariants(speed);
    if (obstacleHistory.length >= 2 && obstacleHistory.at(-1) === obstacleHistory.at(-2)) {
      candidates = candidates.filter((item) => item.type !== obstacleHistory.at(-1));
    }
    const template = candidates[Math.floor(roll() * candidates.length)];
    obstacleHistory.push(template.type);
    const { key, minSpeed, ...shape } = template;
    if (shape.type === 'stool') shape.height = roll() < 0.5 ? STOOL_DIMENSIONS.lowHeight : STOOL_DIMENSIONS.highHeight;
    if (shape.type === 'store') shape.storeVariant = roll() < 0.5 ? 1 : 2;
    return shape;
  }

  function start() {
    Object.assign(state, freshState(), { phase: 'launch' });
    serial = 0;
    runningTime = 0;
    obstacleHistory = [];
    lastPickupType = null;
    hasSpawnedCat = false;
    remindedObstacles = new Set();
    bufferedJump = null;
    openingObstaclePending = true;
    plannedObstacle = chooseObstacle(CONFIG.startSpeed);
    nextObstacleDistance = 0;
    nextPickupTime = 6 + roll() * 4;
    coinTimer = 0;
    emit('start');
  }

  function destroy(obstacle, method, cat) {
    const index = state.obstacles.indexOf(obstacle);
    if (index === -1) return;
    state.obstacles.splice(index, 1);
    if (bufferedJump?.obstacleId === obstacle.id) bufferedJump = null;
    emit('destroy', { obstacle: { ...obstacle }, method, ...(cat ? { cat } : {}) });
  }

  function performJump() {
    if (state.phase !== 'running') return false;
    const { player, powers } = state;
    if (player.landing) return false;
    if (powers.movement === 'flight' && powers.movementTime > 0) {
      player.flying = true;
      player.onGround = false;
      player.vy = CONFIG.flightLift;
      emit('flight-lift', { x: player.x, y: player.y });
      return true;
    }
    if (player.flying) return false;
    const double = !player.onGround && powers.movement === 'double' && player.jumpsUsed < 2;
    if (!player.onGround && !double) return false;
    player.vy = CONFIG.jumpV * (double ? 0.95 : powers.movement === 'high' ? CONFIG.highMultiplier : 1);
    player.jumpsUsed = double ? player.jumpsUsed + 1 : 1;
    player.onGround = false;
    emit('jump', { x: player.x, y: player.y, ...(double ? { double: true } : {}) });
    return true;
  }

  function jump() {
    if (state.phase !== 'running') return false;
    const { player, powers } = state;
    if (player.landing) return false;
    if (player.onGround && !player.flying && state.reminderCue > 0 && state.reminderTargetId !== null) {
      const target = state.obstacles.find((item) => item.id === state.reminderTargetId);
      if (target) {
        const velocity = CONFIG.jumpV * (powers.movement === 'high' ? CONFIG.highMultiplier : 1);
        if (!canJumpObstacleNow(player, target, state.speed, velocity, flightCeiling)) {
          const delay = findSafeJumpDelay(player, target, state.speed, velocity, flightCeiling);
          if (delay !== null) {
            bufferedJump = {
              obstacleId: target.id,
              movement: powers.movement,
              readyAt: runningTime + delay + CONFIG.step,
              expiresAt: runningTime + 0.65,
            };
            return true;
          }
        }
      }
    }
    bufferedJump = null;
    return performJump();
  }

  function flushBufferedJump() {
    if (!bufferedJump) return;
    const { player, powers } = state;
    const target = state.obstacles.find((item) => item.id === bufferedJump.obstacleId);
    if (!target || player.flying || player.landing || !player.onGround
      || powers.movement !== bufferedJump.movement || runningTime > bufferedJump.expiresAt) {
      bufferedJump = null;
      return;
    }
    const velocity = CONFIG.jumpV * (powers.movement === 'high' ? CONFIG.highMultiplier : 1);
    if (runningTime + EPSILON >= bufferedJump.readyAt
      && canJumpObstacleNow(player, target, state.speed, velocity, flightCeiling)) {
      bufferedJump = null;
      performJump();
    }
  }

  function useSkill() {
    const { player, powers } = state;
    if (state.phase !== 'running' || !powers.skill || powers.skillTime <= 0 || state.cooldown > EPSILON) return false;
    if (powers.skill === 'football') {
      const ball = { id: ++serial, x: player.x + 55, y: CONFIG.ballRadius, vx: CONFIG.ballSpeed };
      state.projectiles.push(ball);
      state.cooldown = CONFIG.footballCooldown;
      emit('shoot', { x: ball.x, y: ball.y });
      return true;
    }
    const obstacle = state.obstacles
      .filter((item) => item.x + item.width / 2 >= player.x && item.x - player.x <= CONFIG.catRange)
      .sort((a, b) => a.x - b.x)[0];
    if (obstacle) destroy(obstacle, 'cat', powers.skill);
    state.cooldown = CONFIG.catCooldown;
    return true;
  }

  function pause() {
    if (!['launch', 'running', 'falling'].includes(state.phase)) return;
    state.pausedFrom = state.phase;
    bufferedJump = null;
    state.phase = 'paused';
    emit('pause');
  }

  function resume() {
    if (state.phase !== 'paused') return;
    state.phase = state.pausedFrom || 'running';
    state.pausedFrom = null;
    emit('resume');
  }

  function collect(pickup) {
    const { powers, player } = state;
    bufferedJump = null;
    if (pickup.type === 'star') powers.star = CONFIG.starSeconds;
    else if (pickup.type === 'bird') {
      powers.bird = CONFIG.birdSeconds;
      coinTimer = 0;
    } else if (pickup.type === 'reminder') powers.reminders = CONFIG.reminderCharges;
    else if (MOVEMENT_TYPES.includes(pickup.type)) {
      state.reminderCue = 0;
      state.reminderTargetId = null;
      powers.movement = pickup.type;
      powers.movementTime = CONFIG.movementSeconds;
      if (pickup.type === 'flight') {
        player.flying = true;
        player.landing = false;
        player.onGround = false;
        player.vy = 420;
        powers.grace = Math.max(powers.grace, 0.5);
        emit('flight-lift', { x: player.x, y: player.y });
      } else if (player.flying) beginLanding();
    } else {
      powers.skill = pickup.type;
      powers.skillTime = CONFIG.skillSeconds;
      state.cooldown = 0;
    }
    emit('pickup', { pickupType: pickup.type, x: pickup.x, y: pickup.y });
  }

  function beginLanding() {
    state.player.flying = true;
    state.player.landing = true;
    state.player.onGround = false;
    state.player.vy = Math.min(state.player.vy, -30);
  }

  function updatePowers(dt) {
    const { powers, player } = state;
    state.reminderCue = Math.max(0, state.reminderCue - dt);
    powers.grace = Math.max(0, powers.grace - dt);
    for (const power of ['star', 'bird']) {
      const previous = powers[power];
      if (power === 'bird' && previous > 0) {
        const activeTime = Math.min(previous, dt);
        state.bonus += 50 * activeTime;
        coinTimer += activeTime;
        if (coinTimer >= 0.35) {
          coinTimer -= 0.35;
          emit('bonus', { x: state.player.x + 20, y: state.player.y + 150 });
        }
      }
      powers[power] = Math.max(0, previous - dt);
      if (previous > 0 && powers[power] < EPSILON) {
        powers[power] = 0;
        if (power === 'star') powers.grace = Math.max(powers.grace, CONFIG.graceSeconds);
        emit('power-expire', { power });
      }
    }
    const oldSkill = powers.skill;
    powers.skillTime = Math.max(0, powers.skillTime - dt);
    if (oldSkill && powers.skillTime < EPSILON) {
      powers.skill = null;
      powers.skillTime = 0;
      powers.grace = Math.max(powers.grace, CONFIG.graceSeconds);
      emit('power-expire', { power: oldSkill });
    }
    const oldMovement = powers.movement;
    // A replacement movement power keeps its full duration during forced descent.
    if (!(player.landing && oldMovement && oldMovement !== 'flight')) {
      powers.movementTime = Math.max(0, powers.movementTime - dt);
    }
    if (oldMovement && powers.movementTime < EPSILON) {
      bufferedJump = null;
      state.reminderCue = 0;
      state.reminderTargetId = null;
      powers.movement = null;
      powers.movementTime = 0;
      if (oldMovement === 'flight' || player.flying) beginLanding();
      else powers.grace = Math.max(powers.grace, CONFIG.graceSeconds);
      emit('power-expire', { power: oldMovement });
    }
    state.cooldown = Math.max(0, state.cooldown - dt);
  }

  function generateWorld() {
    if (state.distance >= nextObstacleDistance && (openingObstaclePending || runningTime >= CONFIG.accelerationSeconds)) {
      const groundPickupNearSpawn = state.pickups.some(
        (item) => CAT_TYPES.includes(item.type) && Math.abs(item.x - CONFIG.spawnX) < 180,
      );
      if (groundPickupNearSpawn) nextObstacleDistance += 300;
      else {
        const spawnX = openingObstaclePending ? CONFIG.openingSpawnX : CONFIG.spawnX;
        const obstacle = { id: ++serial, x: spawnX, ...plannedObstacle };
        state.obstacles.push(obstacle);
        openingObstaclePending = false;
        plannedObstacle = chooseObstacle(Math.max(CONFIG.startSpeed, state.speed));
        nextObstacleDistance = state.distance + spawnX - CONFIG.spawnX
          + safeObstacleGap(state.speed, roll(), obstacle.width, plannedObstacle.width, runningTime);
      }
    }
    if (runningTime >= nextPickupTime) {
      // A missed pickup still counts; all three swallow pets share one repeat group.
      const previousWasCat = CAT_TYPES.includes(lastPickupType);
      const candidates = Object.entries(PICKUP_WEIGHTS).filter(([type]) => (
        type !== lastPickupType && !(previousWasCat && CAT_TYPES.includes(type))
      ));
      let ticket = roll() * candidates.reduce((sum, [, weight]) => sum + weight, 0);
      let type = candidates.at(-1)[0];
      for (const [candidate, weight] of candidates) {
        ticket -= weight;
        if (ticket < 0) {
          type = candidate;
          break;
        }
      }
      const groundPickup = CAT_TYPES.includes(type);
      if (groundPickup) {
        // Preserve the group's total draw weight while introducing Guoguo first.
        if (!hasSpawnedCat) type = 'guoguo';
        hasSpawnedCat = true;
      }
      lastPickupType = type;
      let x = CONFIG.spawnX;
      if (groundPickup) {
        for (const obstacle of state.obstacles) {
          if (Math.abs(obstacle.x - x) < obstacle.width / 2 + 95) {
            x = obstacle.x + obstacle.width / 2 + 160;
          }
        }
      }
      const pickup = { id: ++serial, type, x, y: groundPickup ? 40 : (roll() > 0.5 ? 285 : 240), r: 25 };
      if (type === 'star' || type === 'bird') {
        pickup.flightPath = true;
        pickup.vx = -90 - roll() * 50;
        pickup.vy = type === 'star' ? -18 - roll() * 12 : 0;
        pickup.age = 0;
        pickup.y = type === 'star' ? 320 : 310;
        pickup.baseY = pickup.y;
      }
      state.pickups.push(pickup);
      nextPickupTime = runningTime + 8 + roll() * 5;
    }
  }

  function updateReminder() {
    const { player, powers } = state;
    if (!powers.reminders || !player.onGround || player.flying || player.landing) return;
    const target = state.obstacles
      .filter((item) => item.x + item.width / 2 >= player.x - CONFIG.playerWidth / 2 && !remindedObstacles.has(item.id))
      .sort((a, b) => a.x - b.x)[0];
    if (!target) return;
    const velocity = CONFIG.jumpV * (powers.movement === 'high' ? CONFIG.highMultiplier : 1);
    if ((target.x - player.x) / state.speed > 2 * velocity / CONFIG.gravity + CONFIG.reminderLead + 0.25) return;
    if (findSafeJumpDelay(player, target, state.speed, velocity, flightCeiling, CONFIG.reminderLead) === null) return;
    remindedObstacles.add(target.id);
    powers.reminders -= 1;
    state.reminderCue = 0.65;
    state.reminderTargetId = target.id;
    emit('jump-cue', { obstacleId: target.id, x: player.x, y: player.y + 175 });
  }

  function step(dt) {
    if (['ready', 'paused', 'gameover'].includes(state.phase)) return;
    state.phaseTime += dt;
    state.time += dt;
    if (state.phase === 'launch') {
      if (state.phaseTime + EPSILON >= CONFIG.launchSeconds) {
        state.phase = 'running';
        state.phaseTime = 0;
        emit('running');
      }
      return;
    }
    if (state.phase === 'falling') {
      if (state.phaseTime + EPSILON >= CONFIG.fallSeconds) {
        state.phase = 'gameover';
        state.phaseTime = 0;
        emit('gameover');
      }
      return;
    }

    const previousTime = runningTime;
    runningTime += dt;
    state.runTime = runningTime;
    state.speed = worldSpeedAt(runningTime);
    const travel = worldDistanceAt(runningTime) - worldDistanceAt(previousTime);
    state.distance += travel;
    updatePowers(dt);
    flushBufferedJump();

    const { player } = state;
    if (!player.onGround) {
      const gravity = player.flying ? CONFIG.flightGravity : CONFIG.gravity;
      const terminal = player.landing ? CONFIG.landingFallSpeed : CONFIG.flightFallSpeed;
      const velocity = player.flying ? Math.max(-terminal, player.vy) : player.vy;
      player.y += velocity * dt - 0.5 * gravity * dt * dt;
      player.vy = player.flying ? Math.max(-terminal, velocity - gravity * dt) : velocity - gravity * dt;
      if (player.y > flightCeiling) {
        player.y = flightCeiling;
        player.vy = Math.min(player.vy, 0);
      }
      if (player.y < EPSILON && player.vy < 0) {
        player.y = 0;
        player.vy = 0;
        player.onGround = true;
        player.jumpsUsed = 0;
        if (player.landing) {
          player.flying = false;
          player.landing = false;
          state.powers.grace = Math.max(state.powers.grace, CONFIG.graceSeconds);
          emit('flight-land', { x: player.x, y: 0 });
        }
        emit('land', { x: player.x, y: 0 });
      }
    }

    for (const obstacle of state.obstacles) obstacle.x -= travel;
    for (const pickup of state.pickups) {
      pickup.x -= travel;
      if (pickup.flightPath) {
        pickup.baseY ??= pickup.y;
        pickup.age = (pickup.age || 0) + dt;
        pickup.x += (pickup.vx || 0) * dt;
        if (pickup.type === 'bird') pickup.y = pickup.baseY + Math.sin(pickup.age * 2.3) * 10;
        else pickup.y = Math.max(225, pickup.y + (pickup.vy || 0) * dt);
      }
    }
    state.pickups = state.pickups.filter((pickup) => {
      if (playerTouchesPickup(player, pickup)) {
        collect(pickup);
        return false;
      }
      return pickup.x > -80;
    });

    state.projectiles = state.projectiles.filter((ball) => {
      const previousX = ball.x;
      ball.x += ball.vx * dt;
      const target = state.obstacles
        .filter((obstacle) => (
          obstacle.x - obstacle.width / 2 <= ball.x + CONFIG.ballRadius &&
          obstacle.x + obstacle.width / 2 >= previousX - CONFIG.ballRadius &&
          ball.y - CONFIG.ballRadius < obstacle.height
        ))
        .sort((a, b) => a.x - b.x)[0];
      if (target) {
        destroy(target, 'football');
        return false;
      }
      return ball.x < CONFIG.width + 160;
    });

    for (const obstacle of [...state.obstacles]) {
      if (!playerHitsObstacle(player, obstacle)) continue;
      if (state.powers.star > 0 || state.powers.grace > 0 || player.landing) destroy(obstacle, 'invincible');
      else {
        state.phase = 'falling';
        state.phaseTime = 0;
        emit('hit', { obstacle: { ...obstacle } });
        break;
      }
    }
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width / 2 > -80);
    // A small epsilon prevents exact integer bonuses displaying one point short.
    state.score = Math.floor(state.distance / 12 + state.bonus + EPSILON);
    if (state.phase === 'running') {
      generateWorld();
      updateReminder();
    }
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || ['ready', 'paused', 'gameover'].includes(state.phase)) return;
    let remaining = dt;
    while (remaining > EPSILON) {
      const delta = Math.min(CONFIG.step, remaining);
      step(delta);
      remaining -= delta;
      if (['paused', 'gameover'].includes(state.phase)) break;
    }
  }

  return {
    state,
    start,
    action: jump,
    jump,
    useSkill,
    update,
    pause,
    resume,
    setFlightCeiling(height) {
      if (Number.isFinite(height)) flightCeiling = Math.max(220, Math.min(560, height));
      if (state.player.y > flightCeiling) {
        state.player.y = flightCeiling;
        state.player.vy = Math.min(0, state.player.vy);
      }
      return flightCeiling;
    },
    togglePause() { if (state.phase === 'paused') resume(); else pause(); },
  };
}
