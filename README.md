# 终极井字棋 (Ultimate Tic Tac Toe)

一个基于 React 开发的终极井字棋游戏，支持多种游戏模式和难度级别。

## 项目部署

游戏已部署在 GitHub Pages 上，您可以直接访问：

[https://song1678.github.io/ultimate-tic-tac-toe/](https://song1678.github.io/ultimate-tic-tac-toe/)

## 游戏规则

- 棋盘由一个 3x3 的主棋盘组成，每个格子中包含一个 3x3 的子棋盘
- 玩家落子后，下一个玩家必须在与当前落子位置相对应的子棋盘中落子
- 如果目标子棋盘已结束，则可以在任意未结束的子棋盘中落子
- 先赢下 3 个子棋盘形成一条线的玩家获胜

## 功能特性

- **单人模式**：与 AI 对战，提供简单、中等、困难三个难度级别
- **双人模式**：本地双人游戏，在同一设备上进行
- **响应式设计**：适配不同设备尺寸
- **流畅动画**：增强用户体验

## 技术栈

- React 18
- React Router v6
- CSS Modules
- Vite
- Web Workers (AI 计算)

## 安装运行

### 前提条件
- Node.js 16.0+
- npm 7.0+

### 步骤
1. 克隆项目并进入目录
2. 运行 `npm install` 安装依赖
3. 运行 `npm run dev` 启动开发服务器
4. 运行 `npm run build` 构建生产版本

## 许可证

MIT