const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// --- CHANGE HERE: Default video is NULL (Faka) ---
let currentVideoID = null; 
let users = {}; 

io.on('connection', (socket) => {
  
  socket.on('join_user', (name) => {
    users[socket.id] = { 
        id: socket.id, 
        name: name, 
        offset: 0, 
        volume: 100 
    };
    
    io.emit('update_user_list', Object.values(users));
    
    // Only send video ID if one is currently playing
    if (currentVideoID) {
        socket.emit('change_video', currentVideoID);
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('update_user_list', Object.values(users));
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

server.listen(3000, () => {
  console.log('Server running on port 3000');
});