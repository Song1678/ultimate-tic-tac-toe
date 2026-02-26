# 终极井字棋 (Ultimate Tic Tac Toe)

一个基于 React + Node.js 开发的终极井字棋游戏，支持单人 AI 对战、本地双人对战和联网对战三种模式。

## 在线体验

游戏已部署在 GitHub Pages，可直接访问：

**[https://song1678.github.io/ultimate-tic-tac-toe/](https://song1678.github.io/ultimate-tic-tac-toe/)**

---

## 游戏规则

终极井字棋在普通井字棋的基础上增加了一层嵌套结构：

- 主棋盘由 **3×3 = 9 个子棋盘**组成，每个子棋盘本身也是一个 3×3 的井字棋
- 玩家落子后，对手**必须**在与该落子位置对应的子棋盘中落子（例如：你落在子棋盘右上角的中心格，对手就必须在右上角的子棋盘内落子）
- 若目标子棋盘已分出胜负或已满，则对手可以**自由选择**任意未结束的子棋盘落子
- 赢下一个子棋盘，即占领主棋盘上的对应格子
- **先在主棋盘上形成三连的玩家获胜**

---

## 功能特性

### 游戏模式

| 模式 | 说明 |
|------|------|
| **单人模式 - 简单** | AI 随机落子 |
| **单人模式 - 中等** | AI 会避免明显失误，优先堵截和获胜 |
| **单人模式 - 困难** | AI 使用 MCTS（蒙特卡洛树搜索）算法，强度较高 |
| **双人模式 - 本地** | 两名玩家在同一设备上轮流操作 |
| **双人模式 - 联网** | 通过房间码与远端玩家对战 |

### 其他特性

- 联网对战使用 **WebSocket (Socket.IO)** 实时通信，支持创建/加入房间
- AI 运行于 **Web Worker** 中，避免阻塞页面
- 响应式布局，适配手机与桌面端
- 流畅的界面切换和伪3D落子动画

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| React Router | v7 | 客户端路由 |
| CSS Modules | — | 组件级样式隔离 |
| Vite | 7 | 构建工具 |
| Socket.IO Client | 4 | 联网通信 |
| Web Workers | — | AI 计算线程隔离 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js + Express | 4 | HTTP 服务器 |
| Socket.IO | 4 | WebSocket 房间管理 |

---

## 项目结构

```
ultimate-tic-tac-toe/
├── src/
│   ├── main.jsx                 # 应用入口
│   ├── App.jsx                  # 根组件
│   ├── router/index.jsx         # 路由配置
│   ├── pages/
│   │   ├── Home/                # 首页（模式选择）
│   │   ├── Game/                # 本地双人对战
│   │   ├── AIGame/              # 单人 AI 对战
│   │   ├── HostGame/            # 联网对战 - 创建房间
│   │   └── GuestGame/           # 联网对战 - 加入房间
│   ├── components/
│   │   ├── Board/               # 棋盘渲染组件
│   │   └── Buttons/             # 通用按钮组件
│   └── utils/
│       ├── boardHelper.js       # 胜负判断、棋盘工具函数
│       ├── easyAI.js            # 简单 AI（随机）
│       ├── mediumAI.js          # 中等 AI（启发式）
│       ├── hardAI.js            # 困难 AI（MCTS）
│       └── ai.worker.js         # AI Web Worker 入口
└── backend/
    └── server.js                # Express + Socket.IO 后端服务
```

---

## 本地运行

### 前提条件

- Node.js 18+
- npm 9+

### 启动前端

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 启动后端（联网对战需要）

```bash
cd backend

# 安装依赖
npm install

# 启动后端服务器（默认端口 3001）
npm start

# 开发模式（文件变更自动重启）
npm run dev
```

> **注意**：前端默认连接到线上后端（Render 平台）。若需连接本地后端，请修改 `src/pages/HostGame/HostGame.jsx` 和 `src/pages/GuestGame/GuestGame.jsx` 中的 `serverUrl` 为 `http://localhost:3001`。

---

## 部署

### 前端部署到 GitHub Pages

```bash
npm run deploy
```

### 后端部署

后端可部署到任意支持 Node.js 的平台（如 Render、Railway、Fly.io 等）。当前线上后端地址：

```
https://ultimate-tic-tac-toe-28m2.onrender.com
```

---

## 许可证

[MIT](https://opensource.org/licenses/MIT)
