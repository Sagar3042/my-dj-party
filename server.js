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

// Users Store: { socketId: { name: "...", position: {x: 0, y: 0}, label: "Center" } }
let connectedUsers = {};

// Speaker Positions (Coordinates: X=-1 Left, X=1 Right, Y=1 Front, Y=-1 Back)
const POSITIONS = {
    'fl': { x: -1, y: 1, label: "Front Left ◤" },
    'fr': { x: 1, y: 1, label: "Front Right ◥" },
    'rl': { x: -1, y: -1, label: "Rear Left ◣" },
    'rr': { x: 1, y: -1, label: "Rear Right ◢" },
    'c':  { x: 0, y: 0, label: "Center ⏺" }
};

io.on('connection', (socket) => {
  
  // 1. Initial Data
  socket.emit('server_update', roomState);
  socket.emit('force_change_video', roomState.videoId);
  socket.emit('user_list_update', connectedUsers);

  // 2. User Joins
  socket.on('join_user', (name) => {
    connectedUsers[socket.id] = { 
        name: name, 
        position: POSITIONS['c'], // Default Center
        posKey: 'c'
    };
    io.emit('user_list_update', connectedUsers);
    
    // User ke janano tar position ki
    socket.emit('position_update', POSITIONS['c'].label);
  });

  socket.on('disconnect', () => {
    delete connectedUsers[socket.id];
    io.emit('user_list_update', connectedUsers);
  });

  // === ADMIN COMMANDS ===

  socket.on('admin_update', (data) => {
    roomState.isPlaying = data.isPlaying;
    roomState.lastVideoTime = data.videoTime;
    roomState.lastServerTime = Date.now();
    io.emit('server_update', roomState);
  });

  socket.on('admin_change_video', (id) => {
    roomState.videoId = id;
    roomState.isPlaying = false;
    roomState.lastVideoTime = 0;
    io.emit('force_change_video', id);
    io.emit('server_update', roomState);
  });

  // Assign Position (Admin decides where user sits)
  socket.on('admin_assign_pos', (data) => {
    // data = { targetId: '...', posKey: 'fl' }
    if(connectedUsers[data.targetId]) {
        let newPos = POSITIONS[data.posKey];
        connectedUsers[data.targetId].position = newPos;
        connectedUsers[data.targetId].posKey = data.posKey;
        
        // Update Admin List
        io.emit('user_list_update', connectedUsers);
        // Tell that specific user
        io.to(data.targetId).emit('position_update', newPos.label);
    }
  });

  socket.on('admin_force_sync_user', (targetId) => {
    io.to(targetId).emit('trigger_sync');
  });

  // === 3D JOYSTICK LOGIC (The Magic) ===
  socket.on('joystick_move', (coords) => {
    // coords = { x: 0.5, y: -0.5 } (Joystick position)
    
    // Calculate volume for EACH user based on distance from joystick
    for (let socketId in connectedUsers) {
        let user = connectedUsers[socketId];
        let uPos = user.position;

        // Distance Formula
        let dist = Math.sqrt(Math.pow(coords.x - uPos.x, 2) + Math.pow(coords.y - uPos.y, 2));
        
        // Max distance in a 2x2 grid is approx 2.8. Let's normalize.
        // Closer = Louder. Farther = Quieter.
        // Base volume logic:
        let volume = 100 - (dist * 40); // Adjust factor (40) to change sensitivity
        
        if (volume > 100) volume = 100;
        if (volume < 10) volume = 10; // Minimum volume 10%

        io.to(socketId).emit('set_volume', Math.floor(volume));
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`3D Audio Server running on ${PORT}`);
});