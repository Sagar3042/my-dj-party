const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let users = {};

io.on('connection', (socket) => {
    
    // 1. Initial Sync Handshake
    socket.on('join', (data) => {
        users[socket.id] = { name: data.name, role: data.role };
        io.emit('user_update', users);
        // Send server time immediately for clock sync
        socket.emit('clock_sync', { serverTime: Date.now() });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user_update', users);
    });

    // 2. PROFESSIONAL LAUNCH PROTOCOL
    socket.on('request_play', (currentVideoTime) => {
        // Target: Play exactly 2000ms from NOW
        const now = Date.now();
        const targetTime = now + 2000; 

        io.emit('execute_launch', {
            seekTo: currentVideoTime,
            serverTarget: targetTime // When the server wants everyone to be playing
        });
    });

    socket.on('request_pause', (time) => {
        io.emit('execute_pause', time);
    });

    // 3. Continuous Sync Heartbeat
    socket.on('admin_heartbeat', (data) => {
        // Add server timestamp for drift calculation
        data.serverTimestamp = Date.now();
        socket.broadcast.emit('sync_pulse', data);
    });

    socket.on('change_track', (id) => io.emit('load_track', id));
    socket.on('admin_joystick', (data) => socket.broadcast.emit('vol_adjust', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Precision Sync Server Running"); });