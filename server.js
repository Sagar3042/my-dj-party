const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// === STATE ===
let roomState = {
    videoId: "dQw4w9WgXcQ",
    isPlaying: false,
    lastVideoTime: 0,
    lastServerTime: Date.now()
};

// Users Store
let connectedUsers = {};

io.on('connection', (socket) => {
  
  // 1. Initial Data Send
  socket.emit('server_update', roomState);
  socket.emit('force_change_video', roomState.videoId);
  socket.emit('user_list_update', connectedUsers);

  // 2. User Join
  socket.on('join_user', (name) => {
    connectedUsers[socket.id] = { 
        name: name, 
        currentVideoTime: 0, // User er bortoman video time
        position: {x: 0, y: 0} 
    };
    io.emit('user_list_update', connectedUsers);
  });

  socket.on('disconnect', () => {
    delete connectedUsers[socket.id];
    io.emit('user_list_update', connectedUsers);
  });

  // 3. User Reports Time (Monitor er jonno)
  socket.on('report_time', (time) => {
    if(connectedUsers[socket.id]) {
        connectedUsers[socket.id].currentVideoTime = time;
        // Admin ke update pathao (User list update na kore just time update kora jeto, kintu shohoj rakhlam)
        io.emit('monitor_update', { id: socket.id, time: time });
    }
  });

  // === ADMIN COMMANDS ===

  socket.on('admin_update', (data) => {
    roomState.isPlaying = data.isPlaying;
    roomState.lastVideoTime = data.videoTime;
    roomState.lastServerTime = Date.now();
    
    // Broadcast immediately
    io.emit('server_update', roomState);
  });

  socket.on('admin_change_video', (id) => {
    roomState.videoId = id;
    roomState.isPlaying = false;
    roomState.lastVideoTime = 0;
    io.emit('force_change_video', id);
    io.emit('server_update', roomState);
  });

  socket.on('admin_force_sync_user', (targetId) => {
    io.to(targetId).emit('trigger_sync');
  });

  // 3D Audio Joystick
  socket.on('joystick_move', (coords) => {
    for (let socketId in connectedUsers) {
        let user = connectedUsers[socketId];
        let uPos = user.position;
        // Distance calculation
        let dist = Math.sqrt(Math.pow(coords.x - uPos.x, 2) + Math.pow(coords.y - uPos.y, 2));
        let volume = 100 - (dist * 40);
        if (volume > 100) volume = 100;
        if (volume < 10) volume = 10;
        io.to(socketId).emit('set_volume', Math.floor(volume));
    }
  });

  // Assign Position
  socket.on('admin_assign_pos', (data) => {
    if(connectedUsers[data.targetId]) {
        // Simple mapping for 3D
        const POSITIONS = {
            'fl': {x: -1, y: 1}, 'fr': {x: 1, y: 1},
            'rl': {x: -1, y: -1}, 'rr': {x: 1, y: -1}, 'c': {x: 0, y: 0}
        };
        connectedUsers[data.targetId].position = POSITIONS[data.posKey];
        io.to(data.targetId).emit('pos_msg', "Pos: " + data.posKey.toUpperCase());
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});