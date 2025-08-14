// In server/models/Room.model.js
import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // This tells Mongoose that the ID stored here refers to a document in the 'User' collection
    },
    code: {
        type: String,
        default: "// Start coding here..."
    },
    language: {
        type: String,
        default: 'javascript'
    }
},{
    timestamps: true
});

const Room = mongoose.model('Room', roomSchema);
export default Room;