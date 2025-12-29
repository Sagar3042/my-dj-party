const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let users = {};

io.on('connection', (socket) => {
    
    socket.on('join', (data) => {
        users[socket.id] = { name: data.name, role: data.role };
        io.emit('user_update', users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user_update', users);
    });

    // === ⚡ ZERO LATENCY PROTOCOL ⚡ ===
    
    // 1. MASTER PLAY COMMAND
    socket.on('master_play', (data) => {
        // data contains { seekTime: 10.5 }
        // Broadcast to everyone to PLAY NOW
        io.emit('execute_play', {
            seekTime: data.seekTime,
            timestamp: Date.now()
        });
    });

    // 2. MASTER PAUSE COMMAND
    socket.on('master_pause', (data) => {
        io.emit('execute_pause', { seekTime: data.seekTime });
    });

    // 3. SYNC HEARTBEAT (Drift Correction)
    socket.on('admin_pulse', (data) => {
        data.serverTime = Date.now();
        socket.broadcast.emit('sync_correction', data);
    });

    socket.on('change_track', (id) => io.emit('load_track', id));
    socket.on('admin_joystick', (d) => socket.broadcast.emit('vol_adjust', d));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Zero Latency Engine Online"); });