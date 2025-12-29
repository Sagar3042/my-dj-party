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
        lastKnownTime: 0 
    };
    
    // ১. ভিডিও চললে আইডি দাও
    if (currentVideoID) {
        socket.emit('change_video', currentVideoID);
        // ২. অ্যাডমিনকে বলো আর্জেন্ট টাইম আপডেট পাঠাতে (নতুন ইউজারের জন্য)
        io.emit('admin_request_time'); 
    }
    
    io.emit('update_user_list', Object.values(users));
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('update_user_list', Object.values(users));
  });

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
    // এই টাইম আপডেট সবার কাছে পাঠাও
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

// লাইভ মনিটরিং লুপ
setInterval(() => {
    io.emit('update_user_list', Object.values(users));
}, 1000);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});