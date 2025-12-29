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
        users[socket.id] = {
            id: socket.id,
            name: data.name,
            role: data.role,
            time: 0
        };
        io.emit('update_user_list', users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_user_list', users);
    });

    // User Reporting Time
    socket.on('report_time', (t) => {
        if(users[socket.id]) {
            users[socket.id].time = t;
            io.emit('update_user_list', users); // Admin sees updated time
        }
    });

    // --- ADMIN COMMANDS ---

    // 1. Admin Heartbeat (Continuous Time)
    socket.on('admin_heartbeat', (data) => {
        socket.broadcast.emit('sync_pulse', data);
    });

    // 2. Change Track
    socket.on('change_track', (id) => io.emit('load_track', id));

    // 3. TARGETED SYNC FIX (The Magic Logic)
    socket.on('admin_fix_user', (data) => {
        // data = { targetId: '...', targetTime: 12.5 }
        io.to(data.targetId).emit('force_sync_execute', data.targetTime);
    });

    // 4. Joystick
    socket.on('admin_joystick', (coords) => socket.broadcast.emit('adjust_volume', coords));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Professional Server Running"); });