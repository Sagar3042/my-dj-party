const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let currentVideoID = null; 

io.on('connection', (socket) => {
  
  // ১. কেউ জয়েন করলে তাকে বর্তমান ভিডিও আইডি দাও
  if(currentVideoID) {
    socket.emit('change_video', currentVideoID);
  }

  // ২. ভিডিও পরিবর্তন (শুধুমাত্র অ্যাডমিন পাঠাবে)
  socket.on('change_video', (newID) => {
    currentVideoID = newID;
    io.emit('change_video', newID);
  });

  // ৩. প্লে/পজ এবং সিক কন্ট্রোল
  socket.on('video_control', (msg) => {
    // অ্যাডমিনের কমান্ড সবাইকে পাঠাও
    socket.broadcast.emit('video_control', msg);
  });

  // ৪. অ্যাডমিনের লাইভ টাইম আপডেট (Heartbeat)
  socket.on('admin_time_update', (msg) => {
    socket.broadcast.emit('server_time_sync', msg);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});