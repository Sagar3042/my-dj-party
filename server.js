const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// === STUDIO STATE ===
let studioState = {
    videoId: "dQw4w9WgXcQ",
    isPlaying: false,
    adminVideoTime: 0,
    timestamp: Date.now()
};

let users = {};

io.on('connection', (socket) => {
    
    // 1. Send Initial Data
    socket.emit('init_setup', { state: studioState, users: users });

    // 2. User Join
    socket.on('join_studio', (data) => {
        users[socket.id] = {
            name: data.name,
            role: data.role,
            status: 'ready', // ready, playing, buffering
            time: 0,
            volume: 100,
            pos: {x: 0, y: 0, label: 'Center'}
        };
        io.emit('update_user_list', users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_user_list', users);
    });

    // 3. Status Report (Monitor)
    socket.on('report_status', (data) => {
        if(users[socket.id]) {
            users[socket.id].time = data.time;
            users[socket.id].status = data.status;
            // Admin ke live update pathao (Broadcast na kore shudhu admin ke deya valo)
            socket.broadcast.emit('monitor_update', { id: socket.id, data: users[socket.id] });
        }
    });

    // === ADMIN CONTROLS ===

    // SMART PLAY (The 2-Second Launch)
    socket.on('admin_play_request', (currentTime) => {
        const launchTime = Date.now() + 2000; // 2 Seconds in future
        studioState.isPlaying = true;
        studioState.adminVideoTime = currentTime;
        studioState.timestamp = launchTime;

        io.emit('execute_play', {
            seekTo: currentTime,
            launchAt: launchTime
        });
    });

    socket.on('admin_pause', (currentTime) => {
        studioState.isPlaying = false;
        io.emit('execute_pause', { seekTo: currentTime });
    });

    socket.on('admin_seek', (currentTime) => {
        io.emit('execute_seek', { seekTo: currentTime });
    });

    socket.on('admin_change_track', (id) => {
        studioState.videoId = id;
        studioState.isPlaying = false;
        io.emit('load_track', id);
    });

    // 3D Audio Logic
    socket.on('admin_joystick', (coords) => {
        for(let id in users) {
            if(users[id].role === 'user') {
                let u = users[id];
                let dist = Math.sqrt(Math.pow(coords.x - u.pos.x, 2) + Math.pow(coords.y - u.pos.y, 2));
                // Volume Math: Closer = 100%, Farther = Lower
                let vol = Math.max(10, 100 - (dist * 40)); 
                io.to(id).emit('set_volume', Math.floor(vol));
            }
        }
    });

    socket.on('admin_set_pos', (data) => {
        if(users[data.targetId]) {
            const POS = {
                'fl': {x: -1, y: 1, label: 'Front Left'},
                'fr': {x: 1, y: 1, label: 'Front Right'},
                'rl': {x: -1, y: -1, label: 'Rear Left'},
                'rr': {x: 1, y: -1, label: 'Rear Right'},
                'c': {x: 0, y: 0, label: 'Center'}
            };
            users[data.targetId].pos = POS[data.posKey];
            io.emit('update_user_list', users);
            io.to(data.targetId).emit('update_pos_display', POS[data.posKey].label);
        }
    });
    
    socket.on('admin_fix_sync', (targetId) => {
        io.to(targetId).emit('force_resync');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("Studio Server Live"); });