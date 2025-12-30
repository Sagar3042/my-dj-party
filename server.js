const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ডেটা স্টোর
let currentVideoID = "dQw4w9WgXcQ"; 
let users = {}; // কানেক্টেড ইউজারদের লিস্ট

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // নতুন ইউজারকে বর্তমান ভিডিও আইডি পাঠাও
  socket.emit('change_video', currentVideoID);

  socket.on('change_video', (newID) => {
    currentVideoID = newID;
    io.emit('change_video', newID);
  });

  // ভিডিও কন্ট্রোল (Play/Pause/Seek)
  socket.on('video_control', (msg) => {
    // এই মেসেজটি বাকি সবাইকে পাঠাও (Broadcast)
    socket.broadcast.emit('video_control', msg);
  });

  // হোস্টের টাইম আপডেট (Heartbeat)
  socket.on('time_update', (msg) => {
    socket.broadcast.emit('time_update', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});