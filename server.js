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

// --- GLOBAL STATE ---
let currentVideoID = null;
let roomState = {
    isPlaying: false,
    videoTime: 0,
    timestamp: Date.now(), // Last update time
    playbackRate: 1
};

io.on('connection', (socket) => {
  
  // 1. CLOCK SYNC (Ping-Pong)
  // ক্লায়েন্ট সার্ভারের আসল সময় জানতে চাইবে
  socket.on('get_server_time', (clientTimestamp, callback) => {
    callback({
        serverTime: Date.now(),
        clientTimestamp: clientTimestamp
    });
  });

  socket.on('join_user', (name) => {
    socket.userData = { name: name, drift: 0 };
    
    // Send current video
    if (currentVideoID) {
        socket.emit('set_video', currentVideoID);
        
        // Predict current time based on elapsed time
        let elapsed = (Date.now() - roomState.timestamp) / 1000;
        let targetTime = roomState.videoTime + (roomState.isPlaying ? elapsed : 0);
        
        socket.emit('update_state', {
            isPlaying: roomState.isPlaying,
            time: targetTime,
            rate: roomState.playbackRate,
            timestamp: Date.now()
        });
    }
    updateUserList();
  });

  socket.on('disconnect', () => {
    updateUserList();
  });

  // 2. HOST UPDATE (The Truth Source)
  socket.on('host_signal', (data) => {
    roomState.videoTime = data.time;
    roomState.isPlaying = data.isPlaying;
    roomState.playbackRate = data.rate;
    roomState.timestamp = Date.now(); // Record exact server time

    // Broadcast to everyone
    socket.broadcast.emit('update_state', {
        isPlaying: roomState.isPlaying,
        time: roomState.videoTime,
        rate: roomState.playbackRate,
        timestamp: roomState.timestamp
    });
  });

  socket.on('change_video', (id) => {
    currentVideoID = id;
    roomState.videoTime = 0;
    roomState.isPlaying = false;
    io.emit('set_video', id);
  });

  socket.on('report_drift', (drift) => {
    if(socket.userData) socket.userData.drift = drift;
  });
  
  // Admin Commands
  socket.on('admin_cmd', (cmd) => {
      io.emit('exec_cmd', cmd);
  });
});

setInterval(updateUserList, 1000);

function updateUserList() {
    let users = [];
    io.sockets.sockets.forEach(s => {
        if(s.userData) users.push({ id: s.id, name: s.userData.name, drift: s.userData.drift });
    });
    io.emit('user_list', users);
}

server.listen(3000, () => {
  console.log('⚡ Quantum Sync Server Running on 3000');
});
