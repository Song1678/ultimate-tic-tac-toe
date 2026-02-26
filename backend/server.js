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

// 生成随机房间码
function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 处理新连接
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // host创建房间
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

  // guest加入房间
  socket.on('joinRoom', ({ roomCode }) => {
    console.log("guest request joining room: ", roomCode);
    if (!rooms.has(roomCode)) {
      socket.emit('joinError', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomCode);
    if (room.guestId !== null) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }

    room.guestId = socket.id;
    socket.join(roomCode);

    // 发送加入成功消息
    socket.emit('roomJoined', { roomCode });

    // 通知房主有玩家加入
    io.to(room.hostId).emit('playerJoined');

    // 标记房间为准备就绪
    room.ready = true;

    // 通知所有房间内的玩家游戏开始
    io.to(roomCode).emit('gameStart', {
      player1: room.hostId,
      player2: socket.id
    });

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
      if (room.ready) {
        socket.emit('gameStart');
      }
    } else {
      // host（默认）
      room.hostId = socket.id;
      socket.emit('roomCreated', { roomCode }); // 重新确认房间号
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
          // 房间已空，删除
          rooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          // 通知 guest
          io.to(room.guestId).emit('playerLeft');
          console.log(`Host left room ${roomCode}`);
        }
        break;
      } else if (socket.id === room.guestId) {
        room.guestId = null;
        if (room.hostId === null) {
          // 房间已空，删除
          rooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          // 通知 host
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