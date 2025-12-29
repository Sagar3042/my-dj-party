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
let users = {}; 

io.on('connection', (socket) => {
  
  socket.on('join_user', (name) => {
    users[socket.id] = { 
        id: socket.id, 
        name: name, 
        offset: 0, 
        volume: 100,
        lastKnownTime: 0 // ইউজারের বর্তমান টাইম স্টোর করার জন্য
    };
    
    // ভিডিও চললে সাথে সাথে আইডি দাও
    if (currentVideoID) {
        socket.emit('change_video', currentVideoID);
    }
    // আপডেট লিস্ট পাঠাও
    io.emit('update_user_list', Object.values(users));
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('update_user_list', Object.values(users));
  });

  // --- NEW: ইউজার তার নিজের টাইম রিপোর্ট করবে ---
  socket.on('report_user_time', (time) => {
    if(users[socket.id]) {
        users[socket.id].lastKnownTime = time;
    }
  });

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

  socket.on('admin_action', (data) => {
    const targetSocket = data.targetID;
    if(targetSocket === 'all') {
        io.emit('force_client_update', data);
    } else {
        io.to(targetSocket).emit('force_client_update', data);
    }
  });
});

// --- NEW: প্রতি ১ সেকেন্ডে অ্যাডমিনকে সব ইউজারের লাইভ স্ট্যাটাস পাঠানো ---
setInterval(() => {
    // এই ব্রডকাস্টটি শুধুমাত্র ইউজার লিস্ট রিফ্রেশ করার জন্য
    io.emit('update_user_list', Object.values(users));
}, 1000);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});