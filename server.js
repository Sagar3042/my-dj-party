const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*" },
    pingInterval: 2000,
    pingTimeout: 5000
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// --- STATE MANAGEMENT ---
let currentVideoID = null;
let hostState = {
    time: 0,
    timestamp: Date.now(),
    isPlaying: false,
    playbackRate: 1
};

io.on('connection', (socket) => {
  // 1. Initial Data Send
  if (currentVideoID) {
    socket.emit('sync_video_id', currentVideoID);
    
    // Calculate current projected time
    let timePassed = 0;
    if(hostState.isPlaying) {
        timePassed = (Date.now() - hostState.timestamp) / 1000;
    }
    let projectedTime = hostState.time + (timePassed * hostState.playbackRate);
    
    socket.emit('sync_player_state', {
        action: hostState.isPlaying ? 'play' : 'pause',
        time: projectedTime,
        rate: hostState.playbackRate
    });
  }

  // 2. User Join Logic
  socket.on('join_user', (name) => {
    socket.userData = { name: name, drift: 0 };
    broadcastUserList();
  });

  socket.on('disconnect', () => {
    broadcastUserList();
  });

  // 3. HOST UPDATES (The Source of Truth)
  socket.on('host_update', (data) => {
    // Save state on server
    hostState.time = data.time;
    hostState.timestamp = Date.now(); // Server receive time
    hostState.isPlaying = (data.state === 1); // 1 = Playing
    hostState.playbackRate = data.rate || 1;

    // Broadcast accurate pulse to all clients
    // We send 'serverTimestamp' so clients can calculate network latency
    socket.broadcast.emit('server_pulse', {
        hostTime: hostState.time,
        isPlaying: hostState.isPlaying,
        rate: hostState.playbackRate,
        serverTimestamp: Date.now()
    });
  });

  // 4. Video Change
  socket.on('change_video', (id) => {
    currentVideoID = id;
    hostState.time = 0;
    hostState.isPlaying = false;
    io.emit('sync_video_id', id);
  });

  // 5. Admin Commands
  socket.on('admin_action', (data) => {
    io.emit('execute_admin_command', data);
  });

  // 6. User Status Report
  socket.on('report_drift', (drift) => {
    if(socket.userData) socket.userData.drift = drift;
  });
});

// User List Loop
setInterval(() => {
    broadcastUserList();
}, 1000);

function broadcastUserList() {
    let users = [];
    io.sockets.sockets.forEach((s) => {
        if(s.userData) {
            users.push({ id: s.id, name: s.userData.name, drift: s.userData.drift });
        }
    });
    io.emit('update_user_list', users);
}

server.listen(3000, () => {
  console.log('🚀 Ultra-Low Latency Server running on 3000');
});