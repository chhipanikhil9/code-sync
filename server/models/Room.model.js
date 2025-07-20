// In server/models/Room.model.js
import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        default: "// Start coding here..."
    },
    language: {
        type: String,
        default: 'javascript'
    }
});

const Room = mongoose.model('Room', roomSchema);
export default Room;