const socketIO = require('socket.io');
let users = [];
const typingStatus = new Set();

const socket = server => {
  const io = require('socket.io')(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      allowedHeaders: ['my-custom-header'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on("message", (data) => {
      io.emit("messageResponse", data);
    });

    socket.on("typing", (data) => {
      typingStatus.add(socket.id);
      socket.broadcast.emit("typingResponse", data);
    });

    socket.on("stopTyping", () => {
      typingStatus.delete(socket.id);
      socket.broadcast.emit("stopTypingResponse");
    });

    socket.on("newUser", (data) => {
      users.push(data);
      io.emit("newUserResponse", users);
    });

    socket.on('disconnect', () => {
      console.log('🔥: A user disconnected');
      users = users.filter((user) => user.socketID !== socket.id);
      io.emit("newUserResponse", users);
      typingStatus.delete(socket.id);
      socket.broadcast.emit("stopTypingResponse");
    });
  });
};

module.exports = { socket };