const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let users = {}; // Ekhane sob user er data thakbe

io.on('connection', (socket) => {
    
    // 1. User Join Korle
    socket.on('join', (data) => {
        users[socket.id] = {
            name: data.name,
            role: data.role,
            time: 0 // Prothome 0
        };
        // Sobai ke notun list pathao
        io.emit('update_monitor', users);
    });

    // 2. User Disconnect Hole
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_monitor', users);
    });

    // 3. USER REPORTING (User protteke second e tar time pathabe)
    socket.on('report_time', (time) => {
        if(users[socket.id]) {
            users[socket.id].time = time;
            // Admin ke update pathao
            io.emit('update_monitor', users);
        }
    });

    // 4. Admin Heartbeat (Admin er time shobaike pathano)
    socket.on('admin_heartbeat', (data) => {
        // Broadcast to all users for sync
        socket.broadcast.emit('sync_pulse', {
            isPlaying: data.isPlaying,
            time: data.time,
            timestamp: Date.now()
        });
    });

    // Standard Controls
    socket.on('change_track', (id) => io.emit('load_track', id));
    socket.on('admin_joystick', (coords) => socket.broadcast.emit('adjust_volume', coords));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Monitor Server Running"); });