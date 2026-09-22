export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export enum TileType {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  WATER = 3,
  GRASS = 4,
  BASE = 5,
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  speed: number;
  owner: 'player' | 'enemy';
}

export interface Tank {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  speed: number;
  color: string;
  alive: boolean;
  hp: number;
  lastShotTime: number;
  shootCooldown: number;
  moveTimer: number;
  aiChangeDirTimer: number;
}

export interface GameMap {
  tiles: TileType[][];
  tileSize: number;
  cols: number;
  rows: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  player: Tank;
  enemies: Tank[];
  map: GameMap;
  bullets: Bullet[];
  particles: Particle[];
  gameOver: boolean;
  victory: boolean;
  score: number;
  enemySpawnQueue: number;
  enemySpawnTimer: number;
  enemySpawnInterval: number;
  keys: Set<string>;
  lastTimestamp: number;
  bulletIdCounter: number;
  tankIdCounter: number;
  baseAlive: boolean;
  level: number;
}
