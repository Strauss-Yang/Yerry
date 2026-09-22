# Yerry

## 🎮 Tank Battle(坦克大战)

经典 FC 红白机风格《坦克大战》的网页复刻版,使用 Next.js + TypeScript 开发,在浏览器中即可游玩。

### 游戏玩法

- 驾驶坦克保卫基地(屏幕底部的鹰巢),消灭所有敌方坦克即可获得胜利
- 每关共 20 辆敌方坦克,同屏最多出现 4 辆
- 击毁一辆敌方坦克得 100 分
- 基地被摧毁或玩家坦克被击毁则游戏失败

### 地图元素

| 元素 | 说明 |
|------|------|
| 🧱 砖墙 | 可被子弹击破 |
| 🔩 钢墙 | 无法被子弹击破 |
| 🦅 基地 | 需要保护的目标,被击中即失败 |

### 操作方式

| 按键 | 功能 |
|------|------|
| 方向键 / WASD | 移动坦克 |
| 空格 / 回车 | 发射炮弹 |

### 本地运行

```bash
cd tank-battle
npm install
npm run dev
```

然后在浏览器打开 [http://localhost:3000](http://localhost:3000) 即可开始游戏。

### 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **UI**: React 18 + Tailwind CSS
- **渲染**: HTML5 Canvas

### 项目结构

```
tank-battle/
├── app/
│   ├── components/
│   │   └── GameCanvas.tsx   # 游戏画布与渲染逻辑
│   ├── game/
│   │   ├── constants.ts     # 游戏常量与关卡地图
│   │   ├── engine.ts        # 游戏引擎(移动、碰撞、AI)
│   │   └── types.ts         # TypeScript 类型定义
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── package.json
```
