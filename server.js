const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let users = {};

io.on('connection', (socket) => {
    
    // User Join
    socket.on('join', (data) => {
        users[socket.id] = { name: data.name, role: data.role };
        io.emit('user_update', users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user_update', users);
    });

    // === 🚀 FUTURE LAUNCH ENGINE ===
    
    // 1. Admin requests to Play
    socket.on('request_play', (currentVideoTime) => {
        // Calculate Future Time (Now + 1.5 Seconds buffer)
        // 1.5s is enough to cover the 0.7s lag
        let launchTimestamp = Date.now() + 1500; 

        io.emit('execute_launch', {
            seekTo: currentVideoTime,
            launchAt: launchTimestamp
        });
    });

    // 2. Admin Pauses
    socket.on('request_pause', (time) => {
        io.emit('execute_pause', time);
    });

    // 3. Sync Pulse (Keep checking drift)
    socket.on('admin_signal', (data) => {
        socket.broadcast.emit('sync_pulse', data);
    });

    socket.on('change_track', (id) => io.emit('load_track', id));
    socket.on('admin_joystick', (data) => socket.broadcast.emit('vol_adjust', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Zero Latency Server Running"); });