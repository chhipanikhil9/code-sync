// client/src/pages/HomePage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roomId, setRoomId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        try {
            // Ensure credentials (cookies) are sent with the request
            axios.defaults.withCredentials = true;
            const response = await axios.post('http://localhost:3001/api/rooms/new');

            const { id } = response.data;
            toast.success('New room created successfully!');
            navigate(`/rooms/${id}`);
        } catch (error) {
            console.error('Error creating new code room:', error);
            toast.error('Could not create room. Please log in.');
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (roomId.trim() === '') return;
        try {
            // No credentials needed to check a room, so this is fine
            const response = await axios.get(`http://localhost:3001/api/rooms/${roomId}`);
            if (response.status === 200) {
                toast.success('Joined the room successfully!');
                navigate(`/rooms/${roomId}`);
            }
        } catch (error) {
            console.error('Error joining room:', error);
            toast.error('Room not found!');
            setRoomId('');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg dark:bg-gray-800">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
                        CodeShare
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        Real-time collaborative code editor.
                    </p>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-4">
                    <div>
                        <Input
                            type="text"
                            placeholder="Enter Room ID to Join"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="text-center"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={!roomId.trim()}
                        className="w-full"
                        size="lg"
                    >
                        Join Room
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Or
                        </span>
                    </div>
                </div>

                {/* CONDITIONALLY RENDER THIS SECTION */}
                {user ? (
                    <div>
                        <Button
                            onClick={handleCreateRoom}
                            disabled={isLoading}
                            className="w-full"
                            variant="secondary"
                            size="lg"
                        >
                            {isLoading ? 'Creating Session...' : 'Create New Room'}
                        </Button>
                    </div>
                ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <Link to="/login" className="font-medium text-indigo-500 hover:underline">Log in</Link> to create a new room.
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
