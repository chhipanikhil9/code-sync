import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import Room from './models/Room.model.js'
import connectDb from './config/db.js';
import roomRoutes from './routes/Room.route.js';
import userRoutes from './routes/User.route.js'

dotenv.config();
connectDb();

const PORT = process.env.PORT || 3001;


// initialize the server and socket.io server
const app = express();
const server = http.createServer(app);

// this is the server that will handle all the socket connections
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    }
});

// middleware
app.use(cors());
app.use(express.json());

// api routes
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// socket.io connection
// io is a socket.io server instance and socket is a connection to a specific client
io.on('connection', (socket) => {

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('code-change', (data) => {
        // We broadcast the code to everyone else in the room
        console.log(`[Socket.io] Broadcasting 'receive-code-change' to room: ${data.roomId}`);
        socket.to(data.roomId).emit('receive-code-change', data.code);
    });

    socket.on('language-change', (data) => {
        console.log(`[Socket.io] Broadcasting 'receive-language-change' to room: ${data.roomId}`);
        socket.to(data.roomId).emit('receive-language-change', data.language);
    });

    socket.on('save-code', async (data) => {
        try {
            console.log(`[Socket.io] Received 'save-code' for room: ${data.roomId}`);
            await Room.findOneAndUpdate(
                { roomId: data.roomId }, // Condition: find the room with this ID
                { code: data.code, language: data.language },
                { upsert: true } // if not found, create a new room
            );
            console.log(`Saved code for room ${data.roomId}`);
        } catch (error) {
            console.error('Error saving code:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});