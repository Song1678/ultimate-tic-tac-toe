import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  // 连接状态恢复：断线 3 分钟内自动恢复，socket.id 不变、房间关系保留、离线消息补发
  // 恢复失败时客户端走 requestSync 兜底
  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000,
  },
  cors: {
    origin: [
      'https://song1678.github.io',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();        // roomCode -> room 对象
const roomTimers = new Map();   // roomCode -> 延迟删除定时器

const ROOM_EXPIRY_MS = 3 * 60 * 1000;

function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 延迟删除房间，给断线方留出重连时间
// 删除前会检查是否有人已重连，防止误删
function scheduleRoomDeletion(roomCode) {
  cancelRoomDeletion(roomCode); // 先取消已有定时器，避免重复

  const timer = setTimeout(() => {
    roomTimers.delete(roomCode);
    if (!rooms.has(roomCode)) return;

    // 安全检查：删除前确认确实没人在线
    const room = rooms.get(roomCode);
    const hostOnline = room.hostId && io.sockets.sockets.get(room.hostId)?.connected;
    const guestOnline = room.guestId && io.sockets.sockets.get(room.guestId)?.connected;

    if (!hostOnline && !guestOnline) {
      rooms.delete(roomCode);
      console.log(`Room expired: ${roomCode}`);
    } else {
      console.log(`Room ${roomCode} still has connected players, skipping deletion`);
    }
  }, ROOM_EXPIRY_MS);
  roomTimers.set(roomCode, timer);
}

// 取消延迟删除（有人回来了或 guest 加入了）
function cancelRoomDeletion(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

// 共享的游戏状态初始值（不含 myPiece，myPiece 是每个玩家私有的）
function initialGameState() {
  return {
    board: Array.from({ length: 9 }, () => Array(9).fill(null)),
    targetIndex: -1,
    nextPiece: 'X',
  };
}

// 随机分配 host 和 guest 的棋子
function randomPieces() {
  const hostPiece = Math.random() < 0.5 ? 'X' : 'O';
  return { hostPiece, guestPiece: hostPiece === 'X' ? 'O' : 'X' };
}

io.on('connection', (socket) => {
  const recovered = socket.recovered;
  console.log(`Connection: ${socket.id}, recovered: ${recovered}`);
  // 如果 recovered 为 true，说明 connectionStateRecovery 恢复成功，
  // socket.id 不变、房间关系保留、离线消息会补发，无需做任何事。
  // 如果 recovered 为 false，说明是全新连接或恢复失败，
  // 由客户端主动发起 createRoom / joinRoom / requestSync。

  // 恢复成功时，取消该房间的延迟删除定时器
  if (recovered) {
    for (const [roomCode, room] of rooms.entries()) {
      if (socket.id === room.hostId || socket.id === room.guestId) {
        cancelRoomDeletion(roomCode);
        console.log(`Recovery cancelled deletion for room ${roomCode}`);
        break;
      }
    }
  }

  // ---- host 创建房间 ----
  socket.on('createRoom', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, {
      hostId: socket.id,
      guestId: null,
      ready: false,         // guest 加入后变为 true，防止第三人混入
      hostPiece: null,      // gameStart 时随机分配
      guestPiece: null,
      gameState: initialGameState(),
    });

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // ---- guest 加入房间 ----
  socket.on('joinRoom', ({ roomCode }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('joinError', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomCode);
    // ready 为 true 说明游戏已开始过，拒绝新人加入（防止顶替断线玩家）
    if (room.guestId !== null || room.ready) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }

    room.guestId = socket.id;
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode });

    // 通知 host 有人加入（若 host 在线）
    if (room.hostId) {
      io.to(room.hostId).emit('playerJoined');
    }

    // guest 已到，取消可能存在的房间删除定时器
    cancelRoomDeletion(roomCode);

    // 随机分配棋子，初始化游戏
    const { hostPiece, guestPiece } = randomPieces();
    room.hostPiece = hostPiece;
    room.guestPiece = guestPiece;
    room.ready = true;
    room.gameState = initialGameState();

    // 分别通知 host 和 guest 各自的棋子（myPiece 是私有信息，不能广播）
    // 即使 host 当前断线，消息会被 connectionStateRecovery 缓存，恢复后补发
    io.to(room.hostId).emit('gameStart', {
      gameState: room.gameState,
      myPiece: hostPiece,
    });
    io.to(room.guestId).emit('gameStart', {
      gameState: room.gameState,
      myPiece: guestPiece,
    });

    console.log(`Player ${socket.id} joined room ${roomCode} (host=${hostPiece}, guest=${guestPiece})`);
  });

  // ---- connectionStateRecovery 恢复失败后的兜底同步 ----
  // 客户端通过 roomCodeRef 判断自己之前是否在游戏中，
  // 恢复失败时主动请求服务端下发当前游戏状态
  socket.on('requestSync', ({ roomCode, role }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('roomExpired');
      return;
    }

    const room = rooms.get(roomCode);
    socket.join(roomCode); // 新 socket 需要重新加入房间

    // 更新房间中的 socket.id（恢复失败意味着 id 已变）
    if (role === 'host') {
      room.hostId = socket.id;
      cancelRoomDeletion(roomCode);
    } else {
      room.guestId = socket.id;
      cancelRoomDeletion(roomCode);
    }

    if (room.ready) {
      // 游戏进行中：下发完整状态，客户端跳过翻牌动画直接进入游戏
      const myPiece = role === 'host' ? room.hostPiece : room.guestPiece;
      socket.emit('gameSync', { gameState: room.gameState, myPiece });
    } else {
      // 游戏尚未开始（host 重连但 guest 还没来）：告知房间号继续等待
      socket.emit('roomCreated', { roomCode });
    }
  });

  // ---- 落子 ----
  // 服务端是唯一的状态权威源：
  // 1. 客户端 emit makeMove，不立即更新本地棋盘
  // 2. 服务端更新 gameState，广播 moveMade 给所有人（含发送者）
  // 3. 客户端收到 moveMade 后才 dispatch 更新棋盘
  // 这样避免了断线时本地和服务端状态不一致的问题
  socket.on('makeMove', ({ roomCode, move }) => {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    const { i, j } = move;
    const gs = room.gameState;

    gs.board[i][j] = gs.nextPiece;
    gs.nextPiece = gs.nextPiece === 'X' ? 'O' : 'X';
    gs.targetIndex = isBoardResolved(gs.board[j]) ? -1 : j;

    // 广播给房间所有人（包括发送者自己，作为落子确认）
    io.to(roomCode).emit('moveMade', { move });
    console.log(`Move in ${roomCode}:`, move);
  });

  // ---- 重置游戏 ----
  // 重新随机分配棋子，分别通知双方
  socket.on('resetGame', ({ roomCode }) => {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    room.gameState = initialGameState();

    const { hostPiece, guestPiece } = randomPieces();
    room.hostPiece = hostPiece;
    room.guestPiece = guestPiece;

    if (room.hostId) {
      io.to(room.hostId).emit('gameReset', { myPiece: hostPiece });
    }
    if (room.guestId) {
      io.to(room.guestId).emit('gameReset', { myPiece: guestPiece });
    }

    console.log(`Game reset in ${roomCode} (host=${hostPiece}, guest=${guestPiece})`);
  });

  // ---- 断开连接 ----
  // 关键：不清除 hostId / guestId，保留给 connectionStateRecovery 使用。
  // - 恢复成功时：socket.id 不变，hostId/guestId 仍然有效，
  //   离线期间发给该 id 的消息（如 gameStart）会被 recovery 机制补发。
  // - 恢复失败时：客户端走 requestSync，用新 socket.id 更新 hostId/guestId。
  // - 超时未恢复：scheduleRoomDeletion 定时器到期后清理房间。
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    for (const [roomCode, room] of rooms.entries()) {
      if (socket.id === room.hostId) {
        // 检查 guest 是否在线
        const guestOnline = room.guestId
          && io.sockets.sockets.get(room.guestId)?.connected;

        if (!guestOnline) {
          // guest 不在线（或不存在），延迟删除房间
          scheduleRoomDeletion(roomCode);
          console.log(`Host left room ${roomCode}, scheduled for deletion`);
        } else {
          io.to(room.guestId).emit('playerLeft');
          console.log(`Host left room ${roomCode}`);
        }
        break;
      } else if (socket.id === room.guestId) {
        // 检查 host 是否在线
        const hostOnline = room.hostId
          && io.sockets.sockets.get(room.hostId)?.connected;

        if (!hostOnline) {
          // 双方都离线，延迟删除房间
          scheduleRoomDeletion(roomCode);
          console.log(`Guest left room ${roomCode}, scheduled for deletion`);
        } else {
          io.to(room.hostId).emit('playerLeft');
          console.log(`Guest left room ${roomCode}`);
        }
        break;
      }
    }
  });
});

// ---- 棋盘判定工具 ----

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 竖
  [0, 4, 8], [2, 4, 6]             // 对角
];

// 判断一个 3x3 棋盘的结果：'X' | 'O' | 'T'(平局) | null(未结束)
function checkResult(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  if (cells.every(c => c !== null)) return 'T';
  return null;
}

// 子棋盘是否已有结果（用于计算 targetIndex）
function isBoardResolved(cells) {
  return checkResult(cells) !== null;
}

// 健康检查
app.get('/', (req, res) => {
  res.send('Ultimate Tic Tac Toe Backend is running');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});