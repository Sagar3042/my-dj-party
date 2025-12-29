const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let studioState = {
    videoId: "dQw4w9WgXcQ",
    isPlaying: false,
    adminTime: 0,
    lastUpdate: Date.now()
};

let users = {};

io.on('connection', (socket) => {
    
    // Join & Setup
    socket.emit('init', { state: studioState, users: users });

    socket.on('join', (data) => {
        users[socket.id] = { name: data.name, role: data.role, time: 0 };
        io.emit('update_users', users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_users', users);
    });

    // === REAL TIME SYNC ENGINE ===
    
    // 1. Admin sends heartbeat (Continuous Time Update)
    socket.on('admin_heartbeat', (data) => {
        studioState.isPlaying = data.isPlaying;
        studioState.adminTime = data.time;
        studioState.lastUpdate = Date.now();
        
        // Broadcast to all users immediately
        socket.broadcast.emit('sync_pulse', {
            isPlaying: data.isPlaying,
            time: data.time,
            timestamp: Date.now()
        });
    });

    // 2. Load Track
    socket.on('change_track', (id) => {
        studioState.videoId = id;
        io.emit('load_track', id);
    });

    // 3. User Reports (For Monitor)
    socket.on('report_time', (time) => {
        if(users[socket.id]) {
            users[socket.id].time = time;
            socket.broadcast.emit('monitor_update', { id: socket.id, time: time });
        }
    });

    // 4. Admin Force Controls
    socket.on('admin_play', () => { io.emit('force_play'); });
    socket.on('admin_pause', () => { io.emit('force_pause'); });
    socket.on('admin_seek', (time) => { io.emit('force_seek', time); });

    // 3D Audio
    socket.on('admin_joystick', (coords) => {
        socket.broadcast.emit('adjust_volume', coords); // Send to all to calc locally
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Instant Sync Server Running"); });
