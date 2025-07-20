import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';


export const getRoom = async (req, res) => {
    try {
        // console.log('Request received to get room with ID:', req.params.id);
        const { id } = req.params;
        const existingRoom = await Room.findOne({
            roomId: id
        });
        // console.log('Existing room found:', existingRoom);
        if (!existingRoom) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.status(200).json(existingRoom);
    }
    catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const createRoom = async (req, res) => {
    try {
        // console.log('Request received to create a new room');

        const newRoomId = uuidv4(); // Generate a unique room ID
        const newRoom = new Room({
            roomId: newRoomId,
            code: "// Start coding here...",
            language: "cpp"
        });
        await newRoom.save();
        res.status(201).json({ id: newRoomId });

    } catch (error) {
        console.error("Error creating new Room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};   
