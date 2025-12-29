const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*" } // Better connectivity
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let currentVideoID = null;
let hostCurrentTime = 0;
let lastHostUpdate = Date.now();

io.on('connection', (socket) => {
  
  socket.on('join_user', (name) => {
    socket.userData = { name: name, drift: 0, status: 'Synced' };
    
    // Send current video if playing
    if (currentVideoID) {
        socket.emit('change_video', currentVideoID);
        // Calculate estimated current time based on last update
        let estimatedTime = hostCurrentTime + ((Date.now() - lastHostUpdate) / 1000);
        socket.emit('force_sync', { time: estimatedTime, type: 'seek' });
    }
    broadcastUserList();
  });

  socket.on('disconnect', () => {
    broadcastUserList();
  });

  // Host sends time every second
  socket.on('host_time_update', (time) => {
    hostCurrentTime = time;
    lastHostUpdate = Date.now();
    // Broadcast accurate server time to all clients
    socket.broadcast.emit('server_time_pulse', { time: time, timestamp: Date.now() });
  });

  // Client reports their lag/drift status
  socket.on('report_status', (data) => {
    if(socket.userData) {
        socket.userData.drift = data.drift;
        socket.userData.status = data.status;
    }
  });

  socket.on('video_control', (msg) => {
    socket.broadcast.emit('video_control', msg);
  });

  socket.on('change_video', (newID) => {
    currentVideoID = newID;
    hostCurrentTime = 0;
    io.emit('change_video', newID);
  });

  socket.on('admin_command', (data) => {
    if(data.target === 'all') {
        io.emit('perform_command', data);
    } else {
        io.to(data.target).emit('perform_command', data);
    }
  });
});

// Update Admin Dashboard every second
setInterval(() => {
    broadcastUserList();
}, 1000);

function broadcastUserList() {
    let users = [];
    io.sockets.sockets.forEach((socket) => {
        if(socket.userData) {
            users.push({ 
                id: socket.id, 
                name: socket.userData.name,
                drift: socket.userData.drift,
                status: socket.userData.status
            });
        }
    });
    io.emit('update_dashboard', users);
}

server.listen(3000, () => {
  console.log('🚀 High Performance Server Ready on 3000');
});