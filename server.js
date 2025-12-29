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

    // === HEARTBEAT SYNC (High Frequency) ===
    socket.on('admin_signal', (data) => {
        // data = { time: 10.5, isPlaying: true, timestamp: 123456789 }
        socket.broadcast.emit('sync_pulse', data);
    });

    // Control Commands
    socket.on('change_track', (id) => io.emit('load_track', id));
    socket.on('admin_joystick', (data) => socket.broadcast.emit('vol_adjust', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Speed Sync Engine Running"); });