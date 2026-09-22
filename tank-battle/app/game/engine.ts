import {
  Direction,
  TileType,
  GameState,
  Tank,
  Bullet,
  Particle,
} from './types';
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  TANK_SIZE,
  BULLET_SIZE,
  BULLET_SPEED,
  PLAYER_SPEED,
  ENEMY_SPEED,
  ENEMY_SHOOT_COOLDOWN,
  PLAYER_SHOOT_COOLDOWN,
  ENEMY_SPAWN_INTERVAL,
  MAX_ENEMIES_ON_SCREEN,
  ENEMIES_PER_LEVEL,
  LEVEL_MAP,
  ENEMY_SPAWN_POINTS,
  PLAYER_SPAWN,
} from './constants';

let globalBulletId = 0;
let globalTankId = 0;

export function createTank(x: number, y: number, isPlayer: boolean): Tank {
  return {
    id: globalTankId++,
    x,
    y,
    width: TANK_SIZE,
    height: TANK_SIZE,
    direction: isPlayer ? Direction.UP : Direction.DOWN,
    speed: isPlayer ? PLAYER_SPEED : ENEMY_SPEED,
    color: isPlayer ? '#4ade80' : '#f87171',
    alive: true,
    hp: isPlayer ? 1 : 1,
    lastShotTime: 0,
    shootCooldown: isPlayer ? PLAYER_SHOOT_COOLDOWN : ENEMY_SHOOT_COOLDOWN,
    moveTimer: 0,
    aiChangeDirTimer: 0,
  };
}

export function initGameState(): GameState {
  globalBulletId = 0;
  globalTankId = 0;

  const tiles: TileType[][] = LEVEL_MAP.map((row) =>
    row.map((cell) => {
      if (cell === 1) return TileType.BRICK;
      if (cell === 2) return TileType.STEEL;
      if (cell === 5) return TileType.BASE;
      return TileType.EMPTY;
    })
  );

  return {
    player: createTank(PLAYER_SPAWN.x, PLAYER_SPAWN.y, true),
    enemies: [],
    map: {
      tiles,
      tileSize: TILE_SIZE,
      cols: MAP_COLS,
      rows: MAP_ROWS,
    },
    bullets: [],
    particles: [],
    gameOver: false,
    victory: false,
    score: 0,
    enemySpawnQueue: ENEMIES_PER_LEVEL,
    enemySpawnTimer: ENEMY_SPAWN_INTERVAL,
    enemySpawnInterval: ENEMY_SPAWN_INTERVAL,
    keys: new Set(),
    lastTimestamp: 0,
    bulletIdCounter: 0,
    tankIdCounter: 0,
    baseAlive: true,
    level: 1,
  };
}

function rectsIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function tankMapCollision(tank: Tank, map: GameState['map']): boolean {
  const margin = 2;
  const left = tank.x + margin;
  const right = tank.x + tank.width - margin;
  const top = tank.y + margin;
  const bottom = tank.y + tank.height - margin;

  const points = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];

  for (const p of points) {
    const col = Math.floor(p.x / map.tileSize);
    const row = Math.floor(p.y / map.tileSize);
    if (col < 0 || col >= map.cols || row < 0 || row >= map.rows) return true;
    const tile = map.tiles[row][col];
    if (tile === TileType.BRICK || tile === TileType.STEEL || tile === TileType.BASE) {
      return true;
    }
  }
  return false;
}

function tryMoveTank(tank: Tank, dx: number, dy: number, map: GameState['map']): void {
  const oldX = tank.x;
  const oldY = tank.y;
  tank.x += dx;
  tank.y += dy;

  // boundary
  if (tank.x < 0 || tank.x + tank.width > map.cols * map.tileSize ||
      tank.y < 0 || tank.y + tank.height > map.rows * map.tileSize) {
    tank.x = oldX;
    tank.y = oldY;
    return;
  }

  if (tankMapCollision(tank, map)) {
    tank.x = oldX;
    tank.y = oldY;
  }
}

export function spawnEnemy(state: GameState): void {
  if (state.enemySpawnQueue <= 0) return;
  if (state.enemies.length >= MAX_ENEMIES_ON_SCREEN) return;

  const spawn = ENEMY_SPAWN_POINTS[Math.floor(Math.random() * ENEMY_SPAWN_POINTS.length)];
  const enemy = createTank(spawn.x, spawn.y, false);

  // avoid spawning on another tank
  const overlap = state.enemies.some((e) =>
    rectsIntersect(e.x, e.y, e.width, e.height, enemy.x, enemy.y, enemy.width, enemy.height)
  ) || rectsIntersect(
    state.player.x, state.player.y, state.player.width, state.player.height,
    enemy.x, enemy.y, enemy.width, enemy.height
  );

  if (overlap) return;

  state.enemies.push(enemy);
  state.enemySpawnQueue--;
}

function createParticles(x: number, y: number, color: string, count = 8): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  return particles;
}

function shoot(state: GameState, tank: Tank, now: number): void {
  if (!tank.alive) return;
  if (now - tank.lastShotTime < tank.shootCooldown) return;

  tank.lastShotTime = now;
  const bulletSize = BULLET_SIZE;
  let bx = tank.x + tank.width / 2 - bulletSize / 2;
  let by = tank.y + tank.height / 2 - bulletSize / 2;

  if (tank.direction === Direction.UP) by = tank.y - bulletSize;
  if (tank.direction === Direction.DOWN) by = tank.y + tank.height;
  if (tank.direction === Direction.LEFT) bx = tank.x - bulletSize;
  if (tank.direction === Direction.RIGHT) bx = tank.x + tank.width;

  state.bullets.push({
    id: globalBulletId++,
    x: bx,
    y: by,
    width: bulletSize,
    height: bulletSize,
    direction: tank.direction,
    speed: BULLET_SPEED,
    owner: tank.id === state.player.id ? 'player' : 'enemy',
  });
}

function updateBullets(state: GameState, dt: number): void {
  const newBullets: Bullet[] = [];

  for (const b of state.bullets) {
    let dx = 0, dy = 0;
    if (b.direction === Direction.UP) dy = -b.speed;
    if (b.direction === Direction.DOWN) dy = b.speed;
    if (b.direction === Direction.LEFT) dx = -b.speed;
    if (b.direction === Direction.RIGHT) dx = b.speed;

    b.x += dx;
    b.y += dy;

    // out of bounds
    if (b.x < 0 || b.x > state.map.cols * TILE_SIZE || b.y < 0 || b.y > state.map.rows * TILE_SIZE) {
      continue;
    }

    // map collision
    const col = Math.floor((b.x + b.width / 2) / TILE_SIZE);
    const row = Math.floor((b.y + b.height / 2) / TILE_SIZE);
    let hit = false;
    if (col >= 0 && col < state.map.cols && row >= 0 && row < state.map.rows) {
      const tile = state.map.tiles[row][col];
      if (tile === TileType.BRICK) {
        state.map.tiles[row][col] = TileType.EMPTY;
        hit = true;
        state.particles.push(...createParticles(b.x, b.y, '#b45309', 6));
      } else if (tile === TileType.STEEL) {
        hit = true;
        state.particles.push(...createParticles(b.x, b.y, '#94a3b8', 4));
      } else if (tile === TileType.BASE) {
        state.map.tiles[row][col] = TileType.EMPTY;
        state.baseAlive = false;
        state.gameOver = true;
        hit = true;
        state.particles.push(...createParticles(b.x, b.y, '#facc15', 12));
      }
    }
    if (hit) continue;

    // tank collision
    let bulletHit = false;
    const targets: Tank[] = b.owner === 'player' ? state.enemies : [state.player];
    for (const target of targets) {
      if (!target.alive) continue;
      if (rectsIntersect(b.x, b.y, b.width, b.height, target.x, target.y, target.width, target.height)) {
        target.hp--;
        bulletHit = true;
        if (target.hp <= 0) {
          target.alive = false;
          state.particles.push(...createParticles(target.x + target.width / 2, target.y + target.height / 2, target.color, 16));
          if (b.owner === 'player') {
            state.score += 100;
          }
        } else {
          state.particles.push(...createParticles(b.x, b.y, target.color, 6));
        }
        break;
      }
    }
    if (bulletHit) continue;

    newBullets.push(b);
  }

  state.bullets = newBullets;
}

function updateAI(state: GameState, now: number): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    enemy.aiChangeDirTimer -= 16;
    if (enemy.aiChangeDirTimer <= 0) {
      enemy.aiChangeDirTimer = 60 + Math.random() * 120;
      const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
      enemy.direction = dirs[Math.floor(Math.random() * dirs.length)];
    }

    const oldDir = enemy.direction;
    let dx = 0, dy = 0;
    if (enemy.direction === Direction.UP) dy = -enemy.speed;
    if (enemy.direction === Direction.DOWN) dy = enemy.speed;
    if (enemy.direction === Direction.LEFT) dx = -enemy.speed;
    if (enemy.direction === Direction.RIGHT) dx = enemy.speed;

    const oldX = enemy.x;
    const oldY = enemy.y;
    tryMoveTank(enemy, dx, dy, state.map);

    // if blocked, change direction immediately
    if (enemy.x === oldX && enemy.y === oldY) {
      const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT].filter((d) => d !== oldDir);
      enemy.direction = dirs[Math.floor(Math.random() * dirs.length)];
      enemy.aiChangeDirTimer = 30;
    }

    // shoot randomly
    if (Math.random() < 0.02) {
      shoot(state, enemy, now);
    }
  }
}

function updateParticles(state: GameState): void {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function checkEndConditions(state: GameState): void {
  if (!state.player.alive) {
    state.gameOver = true;
    return;
  }
  if (state.enemySpawnQueue <= 0 && state.enemies.filter((e) => e.alive).length === 0) {
    state.victory = true;
  }
}

export function updateGame(state: GameState, now: number): void {
  if (state.gameOver || state.victory) return;

  // player movement
  const player = state.player;
  if (player.alive) {
    let dx = 0, dy = 0;
    if (state.keys.has('ArrowUp') || state.keys.has('w')) {
      dy = -player.speed;
      player.direction = Direction.UP;
    } else if (state.keys.has('ArrowDown') || state.keys.has('s')) {
      dy = player.speed;
      player.direction = Direction.DOWN;
    } else if (state.keys.has('ArrowLeft') || state.keys.has('a')) {
      dx = -player.speed;
      player.direction = Direction.LEFT;
    } else if (state.keys.has('ArrowRight') || state.keys.has('d')) {
      dx = player.speed;
      player.direction = Direction.RIGHT;
    }
    if (dx !== 0 || dy !== 0) {
      tryMoveTank(player, dx, dy, state.map);
    }
    if (state.keys.has(' ') || state.keys.has('Enter')) {
      shoot(state, player, now);
    }
  }

  // enemy spawn
  state.enemySpawnTimer -= 16;
  if (state.enemySpawnTimer <= 0) {
    spawnEnemy(state);
    state.enemySpawnTimer = state.enemySpawnInterval;
  }

  updateAI(state, now);
  updateBullets(state, 16);
  updateParticles(state);

  state.enemies = state.enemies.filter((e) => e.alive);

  checkEndConditions(state);
}
