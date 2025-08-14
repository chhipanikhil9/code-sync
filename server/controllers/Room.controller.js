import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';

export const getRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const existingRoom = await Room.findOne({ roomId: id });
        if (!existingRoom) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.status(200).json(existingRoom);
    }
    catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const createRoom = async (req, res) => {
    try {
        const newRoomId = uuidv4();

        const newRoom = new Room({
            roomId: newRoomId,
            // The 'protect' middleware adds the user object to the request.
            // so that only logged-in users can create rooms.
            user: req.user._id, 
            code: "// Start coding here...",
            language: "javascript"
        });

        await newRoom.save();
        res.status(201).json({ id: newRoomId });

    } catch (error) {
        console.error("Error creating new Room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
