import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: [
      'https://song1678.github.io',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const roomTimers = new Map(); // 延迟删除定时器

const ROOM_EXPIRY_MS = 3 * 60 * 1000; // 3 分钟

// 生成随机房间码
function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 延迟删除房间（给 host 重连留出时间）
function scheduleRoomDeletion(roomCode) {
  const timer = setTimeout(() => {
    rooms.delete(roomCode);
    roomTimers.delete(roomCode);
    console.log(`Room expired: ${roomCode}`);
  }, ROOM_EXPIRY_MS);
  roomTimers.set(roomCode, timer);
}

// 取消延迟删除（host 已重连）
function cancelRoomDeletion(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

// 处理新连接
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // host 创建房间
  socket.on('createRoom', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, {
      hostId: socket.id,
      guestId: null,
      ready: false
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
    // room.ready 表示游戏已开始（含 guest 断线后未重连的情况），一律拒绝新 guest 混入
    if (room.guestId !== null || room.ready) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }

    room.guestId = socket.id;
    socket.join(roomCode);

    socket.emit('roomJoined', { roomCode });

    // 若 host 当前在线才通知，host 断线期间通知无意义
    if (room.hostId) {
      io.to(room.hostId).emit('playerJoined');
    }

    room.ready = true;
    io.to(roomCode).emit('gameStart');

    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });

  // 重连房间（host 和 guest 通用）
  socket.on('rejoinRoom', ({ roomCode, role }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('roomExpired');
      return;
    }

    const room = rooms.get(roomCode);
    socket.join(roomCode);

    if (role === 'guest') {
      room.guestId = socket.id;
      room.ready = true; // 恢复 ready 状态，确保 gameStart 能补发
      socket.emit('gameStart');
    } else {
      // host
      room.hostId = socket.id;
      cancelRoomDeletion(roomCode); // 取消延迟删除
      socket.emit('roomCreated', { roomCode }); // 确认房间号（同原房间号）
      if (room.ready) {
        socket.emit('gameStart');
      }
    }
  });

  // 转发落子消息
  socket.on('makeMove', ({ roomCode, move }) => {
    if (!rooms.has(roomCode)) return;

    socket.to(roomCode).emit('moveMade', { move });
    console.log(`Move made in room ${roomCode}:`, move);
  });

  // 转发重置游戏
  socket.on('resetGame', ({ roomCode }) => {
    console.log(`Game reset in room ${roomCode}`);
    if (!rooms.has(roomCode)) return;

    socket.to(roomCode).emit('gameReset');
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    for (const [roomCode, room] of rooms.entries()) {
      if (socket.id === room.hostId) {
        room.hostId = null;
        if (room.guestId === null) {
          // 无 guest：延迟删除，给 host 重连留出时间，房间号继续有效
          scheduleRoomDeletion(roomCode);
          console.log(`Host left room ${roomCode}, scheduled for deletion in ${ROOM_EXPIRY_MS / 1000}s`);
        } else {
          io.to(room.guestId).emit('playerLeft');
          console.log(`Host left room ${roomCode}`);
        }
        break;
      } else if (socket.id === room.guestId) {
        room.guestId = null;
        // 不重置 room.ready：防止其他人混入，且支持原 guest 重连后继续游戏
        if (room.hostId === null) {
          cancelRoomDeletion(roomCode);
          rooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          io.to(room.hostId).emit('playerLeft');
          console.log(`Guest left room ${roomCode}`);
        }
        break;
      }
    }
  });
});

// 健康检查
app.get('/', (req, res) => {
  res.send('Ultimate Tic Tac Toe Backend is running');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});