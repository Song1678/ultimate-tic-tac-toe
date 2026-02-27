import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000, // 3 分钟内可恢复
  },
  cors: {
    origin: [
      'https://song1678.github.io',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const roomTimers = new Map();

const ROOM_EXPIRY_MS = 3 * 60 * 1000;

function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function scheduleRoomDeletion(roomCode) {
  const timer = setTimeout(() => {
    rooms.delete(roomCode);
    roomTimers.delete(roomCode);
    console.log(`Room expired: ${roomCode}`);
  }, ROOM_EXPIRY_MS);
  roomTimers.set(roomCode, timer);
}

function cancelRoomDeletion(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

function initialGameState() {
  return {
    board: Array.from({ length: 9 }, () => Array(9).fill(null)),
    targetIndex: -1,
    nextPiece: 'X',
  };
}

io.on('connection', (socket) => {
  const recovered = socket.recovered;
  console.log(`Connection: ${socket.id}, recovered: ${recovered}`);

  // 如果恢复成功，socket.id 不变，房间关系保留，无需做任何事
  // 如果恢复失败，则是全新连接，由客户端主动发起 createRoom / joinRoom

  // host 创建房间
  socket.on('createRoom', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, {
      hostId: socket.id,
      guestId: null,
      ready: false,
      gameState: initialGameState(),
    });

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // guest 加入房间
  socket.on('joinRoom', ({ roomCode }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('joinError', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomCode);
    if (room.guestId !== null || room.ready) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }

    room.guestId = socket.id;
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode });

    if (room.hostId) {
      io.to(room.hostId).emit('playerJoined');
    }

    cancelRoomDeletion(roomCode);

    room.ready = true;
    room.gameState = initialGameState();
    io.to(roomCode).emit('gameStart', { gameState: room.gameState });

    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });

  // 客户端恢复失败后请求同步游戏状态
  socket.on('requestSync', ({ roomCode, role }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('roomExpired');
      return;
    }

    const room = rooms.get(roomCode);
    socket.join(roomCode);

    if (role === 'host') {
      room.hostId = socket.id;
      cancelRoomDeletion(roomCode);
    } else {
      room.guestId = socket.id;
    }

    if (room.ready) {
      socket.emit('gameSync', { gameState: room.gameState });
    } else {
      // 游戏尚未开始，告知客户端当前房间号
      socket.emit('roomCreated', { roomCode });
    }
  });

  // 转发落子消息，同时更新服务端状态
  socket.on('makeMove', ({ roomCode, move }) => {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    const { i, j } = move;
    const gs = room.gameState;

    // 更新服务端棋盘
    gs.board[i][j] = gs.nextPiece;
    gs.nextPiece = gs.nextPiece === 'X' ? 'O' : 'X';
    // 计算 targetIndex（简化版：检查目标子棋盘是否已满或已决出）
    gs.targetIndex = isBoardResolved(gs.board[j]) ? -1 : j;

    io.to(roomCode).emit('moveMade', { move });
    console.log(`Move in ${roomCode}:`, move);
  });

  // 重置游戏
  socket.on('resetGame', ({ roomCode }) => {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    room.gameState = initialGameState();

    io.to(roomCode).emit('gameReset');
    console.log(`Game reset in ${roomCode}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    for (const [roomCode, room] of rooms.entries()) {
      if (socket.id === room.hostId) {
        room.hostId = null;
        if (room.guestId === null) {
          scheduleRoomDeletion(roomCode);
        } else {
          io.to(room.guestId).emit('playerLeft');
        }
        break;
      } else if (socket.id === room.guestId) {
        room.guestId = null;
        if (room.hostId === null) {
          cancelRoomDeletion(roomCode);
          rooms.delete(roomCode);
        } else {
          io.to(room.hostId).emit('playerLeft');
        }
        break;
      }
    }
  });
});

// ---- 服务端棋盘判定工具 ----

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkResult(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  if (cells.every(c => c !== null)) return 'T';
  return null;
}

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