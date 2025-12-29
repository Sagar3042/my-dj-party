const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// HTML ফাইল দেখানোর জন্য
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// === GLOBAL STATE (পুরো রুমের অবস্থা) ===
let roomState = {
    videoId: "dQw4w9WgXcQ", // ডিফল্ট ভিডিও (চাইলে চেঞ্জ করতে পারেন)
    isPlaying: false,
    lastVideoTime: 0,      // ভিডিওর কোন সেকেন্ডে আছে
    lastServerTime: Date.now() // রিয়েল টাইমে কখন আপডেট হয়েছে
};

// === USER LIST (কে কে কানেক্টেড আছে) ===
let connectedUsers = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // 1. নতুন কেউ এলে তাকে বর্তমান অবস্থা পাঠানো
  socket.emit('server_update', roomState);
  socket.emit('force_change_video', roomState.videoId);
  socket.emit('user_list_update', connectedUsers); // বর্তমান মেম্বার লিস্ট

  // 2. ইউজার যখন নাম দিয়ে জয়েন করবে
  socket.on('join_user', (name) => {
    connectedUsers[socket.id] = name;
    // সবাইকে নতুন লিস্ট পাঠানো
    io.emit('user_list_update', connectedUsers);
    console.log(`${name} joined!`);
  });

  // 3. কেউ চলে গেলে (Disconnect)
  socket.on('disconnect', () => {
    if (connectedUsers[socket.id]) {
      console.log(`${connectedUsers[socket.id]} left.`);
      delete connectedUsers[socket.id];
      // সবাইকে আপডেট করা লিস্ট পাঠানো
      io.emit('user_list_update', connectedUsers);
    }
  });

  // ===================================
  //       ADMIN COMMANDS (নিয়ন্ত্রণ)
  // ===================================

  // ক. অ্যাডমিন প্লে/পজ বা সিক (Seek) করলে
  socket.on('admin_update', (data) => {
    roomState.isPlaying = data.isPlaying;
    roomState.lastVideoTime = data.videoTime;
    roomState.lastServerTime = Date.now(); // একদম সঠিক সময় রেকর্ড করা
    
    // সবাইকে আপডেট পাঠানো
    io.emit('server_update', roomState);
  });

  // খ. অ্যাডমিন ভিডিও চেঞ্জ করলে
  socket.on('admin_change_video', (id) => {
    roomState.videoId = id;
    roomState.isPlaying = false;
    roomState.lastVideoTime = 0;
    
    // সবাইকে ভিডিও চেঞ্জ করতে বলা
    io.emit('force_change_video', id);
    // স্টেট রিসেট করে আপডেট পাঠানো
    io.emit('server_update', roomState);
  });

  // গ. অ্যাডমিন নির্দিষ্ট কারো সিঙ্ক ফিক্স করলে (Remote Sync)
  socket.on('admin_force_sync_user', (targetSocketId) => {
    // শুধু ওই নির্দিষ্ট ইউজারকে মেসেজ পাঠানো
    io.to(targetSocketId).emit('trigger_sync');
  });

  // ঘ. অ্যাডমিন কারো ভলিউম কমালে/ বাড়ালে
  socket.on('admin_volume_control', (data) => {
    // data = { targetId: '...', volume: 50 }
    io.to(data.targetId).emit('set_volume', data.volume);
  });

});

// === SERVER PORT SETUP (হোস্টিংয়ের জন্য জরুরি) ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});