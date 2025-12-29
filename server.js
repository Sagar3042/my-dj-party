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
  
  // ১. ইউজার জয়েন করলে লিস্টে নাম তোলো
  socket.on('join_user', (name) => {
    users[socket.id] = { 
        id: socket.id, 
        name: name, 
        offset: 0, // ম্যানুয়াল লেটেন্সি অ্যাডজাস্মেন্ট
        volume: 100 
    };
    
    // অ্যাডমিনকে নতুন ইউজার লিস্ট পাঠাও
    io.emit('update_user_list', Object.values(users));
    
    // নতুন ইউজারকে বর্তমান ভিডিও দাও
    socket.emit('change_video', currentVideoID);
  });

  // ২. ডিসকানেক্ট হলে লিস্ট থেকে ডিলিট করো
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('update_user_list', Object.values(users));
  });

  // ৩. শুধু অ্যাডমিন ভিডিও কন্ট্রোল করতে পারবে
  socket.on('video_control', (msg) => {
    socket.broadcast.emit('video_control', msg);
  });

  socket.on('change_video', (newID) => {
    currentVideoID = newID;
    io.emit('change_video', newID);
  });

  socket.on('time_update', (msg) => {
    socket.broadcast.emit('time_update', msg);
  });

  // ৪. অ্যাডমিন স্পেসিফিক ইউজারের ল্যাগ ফিক্স বা ভলিউম চেঞ্জ করলে
  socket.on('admin_action', (data) => {
    const targetSocket = data.targetID;
    
    // যদি 'all' হয়, সবাইকে পাঠাও (Global Fix)
    if(targetSocket === 'all') {
        io.emit('force_client_update', data);
    } else {
        // স্পেসিফিক ইউজারকে কমান্ড পাঠাও
        io.to(targetSocket).emit('force_client_update', data);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});