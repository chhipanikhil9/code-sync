import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import Room from './models/Room.model.js';
import connectDb from './config/db.js';
import roomRoutes from './routes/Room.route.js';
import userRoutes from './routes/User.route.js';
import aiRoutes from './routes/AI.route.js';
import executeRoutes from './routes/Execute.route.js';
import cookieParser from 'cookie-parser';

dotenv.config();
connectDb();

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
const frontendURL = "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: frontendURL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: frontendURL,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/execute', executeRoutes);

const MAX_CLIENTS_PER_ROOM = 3;

io.on('connection', (socket) => {

    socket.on('join-room', ({ roomId, user }) => {
        const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
        const numClients = clientsInRoom ? clientsInRoom.size : 0;

        if (numClients >= MAX_CLIENTS_PER_ROOM) {
            socket.emit('room-full');
            return;
        }

        socket.join(roomId);

        const otherUsers = [];
        if (clientsInRoom) {
            clientsInRoom.forEach(clientId => {
                if (clientId !== socket.id) {
                    otherUsers.push(clientId);
                }
            });
        }

        socket.to(roomId).emit('user-connected', { socketId: socket.id, user });
        socket.emit('existing-users', otherUsers);
    });

    socket.on('question-generated', async ({ roomId, question }) => {
        try {
            // --- FIX: Search by the correct 'roomId' field ---
            await Room.findOneAndUpdate({ roomId: roomId }, { generatedQuestion: question });
            socket.to(roomId).emit('receive-question', question);
        } catch (error) {
            console.error("Error saving/broadcasting question:", error);
        }
    });

    socket.on('code-change', (data) => socket.to(data.roomId).emit('receive-code-change', data.code));
    socket.on('language-change', (data) => socket.to(data.roomId).emit('receive-language-change', data.language));
    socket.on('cursor-move', (data) => socket.to(data.roomId).emit('cursor-update', data));
    socket.on('send-message', (data) => io.to(data.roomId).emit('receive-message', data));

    // WebRTC Signaling
    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', data);
    });

    socket.on('save-code', async (data) => {
        try {
            // --- FIX: Search by the correct 'roomId' field ---
            await Room.findOneAndUpdate(
                { roomId: data.roomId },
                { code: data.code, language: data.language }
            );
        } catch (error) {
            console.error('Error saving code:', error);
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('user-disconnected', socket.id);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
