const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Server State
let currentVideoID = null;
let hostState = {
    time: 0,
    isPlaying: false,
    timestamp: Date.now()
};

io.on('connection', (socket) => {
    
    // 1. নতুন ইউজার এলে তাকে বর্তমান ভিডিও এবং স্টেট দাও
    if (currentVideoID) {
        socket.emit('change_video', currentVideoID);
        
        // বর্তমান সময় ক্যালকুলেট করো
        let timePassed = 0;
        if(hostState.isPlaying) {
            timePassed = (Date.now() - hostState.timestamp) / 1000;
        }
        let targetTime = hostState.time + timePassed;

        socket.emit('player_update', {
            action: hostState.isPlaying ? 'play' : 'pause',
            time: targetTime
        });
    }

    // 2. অ্যাডমিন ভিডিও চেঞ্জ করলে
    socket.on('change_video', (id) => {
        currentVideoID = id;
        hostState.time = 0;
        hostState.isPlaying = true;
        hostState.timestamp = Date.now();
        io.emit('change_video', id);
    });

    // 3. অ্যাডমিন প্লে/পজ/সিক করলে
    socket.on('video_control', (data) => {
        hostState.isPlaying = (data.action === 'play');
        hostState.time = data.time;
        hostState.timestamp = Date.now();
        
        // বাকি সবাইকে পাঠাও
        socket.broadcast.emit('player_update', data);
    });
});

server.listen(3000, () => {
  console.log('Server Ready on port 3000');
});