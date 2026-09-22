'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { GameState, TileType, Direction } from '../game/types';
import { initGameState, updateGame } from '../game/engine';
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from '../game/constants';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initGameState());
  const animRef = useRef<number>(0);
  const [overlay, setOverlay] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState(0);
  const [enemiesLeft, setEnemiesLeft] = useState(20);

  const width = MAP_COLS * TILE_SIZE;
  const height = MAP_ROWS * TILE_SIZE;

  const drawTank = useCallback((ctx: CanvasRenderingContext2D, tank: GameState['player'], isPlayer: boolean) => {
    if (!tank.alive) return;
    ctx.save();
    ctx.translate(tank.x + tank.width / 2, tank.y + tank.height / 2);
    // rotate based on direction
    let angle = 0;
    if (tank.direction === Direction.RIGHT) angle = Math.PI / 2;
    if (tank.direction === Direction.DOWN) angle = Math.PI;
    if (tank.direction === Direction.LEFT) angle = -Math.PI / 2;
    ctx.rotate(angle);

    // body
    ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
    ctx.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);

    // tracks
    ctx.fillStyle = isPlayer ? '#14532d' : '#7f1d1d';
    ctx.fillRect(-tank.width / 2, -tank.height / 2, 6, tank.height);
    ctx.fillRect(tank.width / 2 - 6, -tank.height / 2, 6, tank.height);

    // turret
    ctx.fillStyle = isPlayer ? '#4ade80' : '#fca5a5';
    ctx.fillRect(-8, -8, 16, 16);

    // barrel
    ctx.fillStyle = isPlayer ? '#86efac' : '#fecaca';
    ctx.fillRect(-3, -tank.height / 2 - 6, 6, 14);

    ctx.restore();
  }, []);

  const drawMap = useCallback((ctx: CanvasRenderingContext2D, map: GameState['map']) => {
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        const tile = map.tiles[row][col];
        const x = col * map.tileSize;
        const y = row * map.tileSize;
        if (tile === TileType.BRICK) {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 2, y + 2, map.tileSize - 4, map.tileSize - 4);
          ctx.strokeStyle = '#92400e';
          ctx.strokeRect(x + 4, y + 4, map.tileSize - 8, map.tileSize - 8);
        } else if (tile === TileType.STEEL) {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(x + 2, y + 2, map.tileSize - 4, map.tileSize - 4);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(x + 6, y + 6, map.tileSize - 12, map.tileSize - 12);
        } else if (tile === TileType.BASE) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 4, y + 4, map.tileSize - 8, map.tileSize - 8);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x + 8, y + 8, map.tileSize - 16, map.tileSize - 16);
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, map.tileSize - 8, map.tileSize - 8);
          ctx.lineWidth = 1;
          // eagle shape simplified
          ctx.fillStyle = '#713f12';
          ctx.beginPath();
          ctx.moveTo(x + map.tileSize / 2, y + 8);
          ctx.lineTo(x + map.tileSize - 8, y + map.tileSize - 8);
          ctx.lineTo(x + 8, y + map.tileSize - 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }, []);

  const drawBullet = useCallback((ctx: CanvasRenderingContext2D, bullet: GameState['bullets'][0]) => {
    ctx.fillStyle = bullet.owner === 'player' ? '#facc15' : '#fb923c';
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // glow
    ctx.shadowColor = bullet.owner === 'player' ? '#facc15' : '#fb923c';
    ctx.shadowBlur = 6;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: GameState['particles']) => {
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    ctx.clearRect(0, 0, width, height);

    // background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    // grid lines subtle
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAP_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, height);
      ctx.stroke();
    }
    for (let i = 0; i <= MAP_ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(width, i * TILE_SIZE);
      ctx.stroke();
    }

    drawMap(ctx, state.map);

    for (const bullet of state.bullets) {
      drawBullet(ctx, bullet);
    }

    drawTank(ctx, state.player, true);
    for (const enemy of state.enemies) {
      drawTank(ctx, enemy, false);
    }

    drawParticles(ctx, state.particles);
  }, [width, height, drawMap, drawTank, drawBullet, drawParticles]);

  const loop = useCallback((timestamp: number) => {
    const state = stateRef.current;
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    // cap dt
    updateGame(state, timestamp);
    state.lastTimestamp = timestamp;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx, state);
    }

    setScore(state.score);
    setEnemiesLeft(state.enemySpawnQueue + state.enemies.filter((e) => e.alive).length);

    if (state.gameOver) {
      setOverlay('gameover');
      return;
    }
    if (state.victory) {
      setOverlay('victory');
      return;
    }

    animRef.current = requestAnimationFrame(loop);
  }, [draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      stateRef.current.keys.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (overlay === 'playing') {
      animRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [overlay, loop]);

  const startGame = () => {
    stateRef.current = initGameState();
    setScore(0);
    setEnemiesLeft(20);
    setOverlay('playing');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-8 text-white font-mono text-sm">
        <div>分数: <span className="text-yellow-400">{score}</span></div>
        <div>剩余敌人: <span className="text-red-400">{enemiesLeft}</span></div>
      </div>

      <div className="relative border-4 border-gray-700 rounded-sm shadow-2xl">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block"
          style={{ imageRendering: 'pixelated' }}
        />

        {overlay !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
            {overlay === 'start' && (
              <>
                <h1 className="text-4xl font-bold mb-2 text-green-400 tracking-wider">坦克大战</h1>
                <p className="text-gray-300 mb-6">Next.js + Canvas 版本</p>
                <div className="text-sm text-gray-400 mb-6 space-y-1 text-center">
                  <p>WASD / 方向键 移动</p>
                  <p>空格 / 回车 射击</p>
                  <p>保护基地，消灭所有敌人</p>
                </div>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-bold transition"
                >
                  开始游戏
                </button>
              </>
            )}
            {overlay === 'gameover' && (
              <>
                <h1 className="text-4xl font-bold mb-2 text-red-500">游戏结束</h1>
                <p className="text-xl mb-4">最终分数: {score}</p>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-bold transition"
                >
                  重新开始
                </button>
              </>
            )}
            {overlay === 'victory' && (
              <>
                <h1 className="text-4xl font-bold mb-2 text-yellow-400">胜利!</h1>
                <p className="text-xl mb-4">最终分数: {score}</p>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-bold transition"
                >
                  再玩一次
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-gray-500 text-xs font-mono">
        提示: 黄色三角形是基地，必须保护它不被击中
      </div>
    </div>
  );
}
