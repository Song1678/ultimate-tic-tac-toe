import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://song1678.github.io',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST']
  }
});

// 房间存储，格式：{ roomCode: { players: [socketId1, socketId2], ready: false } }
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

  // 创建房间
  socket.on('createRoom', () => {
    let roomCode;
    // 确保生成唯一的房间码
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    // 创建新房间
    rooms.set(roomCode, {
      players: [socket.id],
      ready: false
    });

    // 加入房间
    socket.join(roomCode);

    // 发送房间码给房主
    socket.emit('roomCreated', { roomCode });
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // 加入房间
  socket.on('joinRoom', ({ roomCode }) => {
    if (!rooms.has(roomCode)) {
      socket.emit('joinError', { message: 'Room not found' });
      return;
    }

    const room = rooms.get(roomCode);
    if (room.players.length >= 2) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }

    // 加入房间
    room.players.push(socket.id);
    socket.join(roomCode);

    // 发送加入成功消息
    socket.emit('roomJoined', { roomCode });

    // 通知房主有玩家加入
    io.to(room.players[0]).emit('playerJoined');

    // 标记房间为准备就绪
    room.ready = true;

    // 通知所有房间内的玩家游戏开始
    io.to(roomCode).emit('gameStart', {
      player1: room.players[0],
      player2: socket.id
    });

    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });

  // 转发落子消息
  socket.on('makeMove', ({ roomCode, move }) => {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    if (!room.ready) return;

    // 转发给房间内其他玩家
    socket.to(roomCode).emit('moveMade', { move });
    console.log(`Move made in room ${roomCode}:`, move);
  });

  // 转发游戏结束消息
  socket.on('gameOver', ({ roomCode, result }) => {
    if (!rooms.has(roomCode)) return;

    // 转发给房间内其他玩家
    socket.to(roomCode).emit('gameOver', { result });
    console.log(`Game over in room ${roomCode}:`, result);
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    // 检查并清理包含此玩家的房间
    for (const [roomCode, room] of rooms.entries()) {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        // 从房间中移除玩家
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          // 房间为空，删除房间
          rooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          // 通知房间内其他玩家
          io.to(room.players[0]).emit('playerLeft');
          console.log(`Player left room ${roomCode}, remaining players: ${room.players.length}`);
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
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});