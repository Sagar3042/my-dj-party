const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let currentVideoID = "dQw4w9WgXcQ"; 

io.on('connection', (socket) => {
  // Notun keu ele current video dao
  socket.emit('change_video', currentVideoID);

  socket.on('change_video', (newID) => {
    currentVideoID = newID;
    io.emit('change_video', newID);
  });

  socket.on('video_control', (msg) => {
    // Shobaike pathao (Broadcast)
    socket.broadcast.emit('video_control', msg);
  });

  // Host theke time update niye shobaike pathano (Sync Heartbeat)
  socket.on('time_update', (msg) => {
    socket.broadcast.emit('time_update', msg);
  });
});

server.listen(3000, () => {
  console.log('Server Ready on port 3000');
});