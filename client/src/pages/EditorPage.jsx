import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
const languages = ['javascript', 'python', 'java', 'cpp'];
const AUTOSAVE_DELAY = 2000;

const EditorPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user from context for chat

    // State for editor
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');

    // State for chat
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');

    // Refs and Socket state
    const [socket, setSocket] = useState(null);
    const saveTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null); // Ref to scroll to bottom of chat

    // Effect for initializing the socket connection
    useEffect(() => {
        const s = io(SOCKET_SERVER_URL, { withCredentials: true });
        setSocket(s);
        return () => { s.disconnect(); };
    }, []);

    // Effect to scroll chat to the bottom when a new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Effect for fetching data and setting up all socket listeners
    useEffect(() => {
        if (!socket || !roomId) return;

        axios.defaults.withCredentials = true;
        axios.get(`${SOCKET_SERVER_URL}/api/rooms/${roomId}`)
            .then(response => {
                const { code: initialCode, language: initialLanguage } = response.data;
                setCode(initialCode);
                setLanguage(initialLanguage);
            })
            .catch(error => {
                toast.error("Room not found. Redirecting...");
                navigate('/');
            });

        socket.emit('join-room', roomId);

        // Listener for code changes
        const handleCodeChange = (receivedCode) => setCode(receivedCode);
        socket.on('receive-code-change', handleCodeChange);

        // Listener for language changes
        const handleLanguageChange = (receivedLanguage) => setLanguage(receivedLanguage);
        socket.on('receive-language-change', handleLanguageChange);

        const handleMessageReceive = (data) => {
            // console.log('Received message from server:', data);
            setMessages((prevMessages) => [...prevMessages, data]);
        };
        socket.on('receive-message', handleMessageReceive);

        return () => {
            socket.off('receive-code-change', handleCodeChange);
            socket.off('receive-language-change', handleLanguageChange);
            socket.off('receive-message', handleMessageReceive);
        };
    }, [socket, roomId, navigate]);

    const saveCode = (currentCode, currentLanguage) => {
        if (socket) {
            socket.emit('save-code', { roomId, code: currentCode, language: currentLanguage });
        }
    };

    const handleEditorChange = (value) => {
        setCode(value);
        if (socket) {
            socket.emit('code-change', { roomId, code: value });
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveCode(value, language);
                toast.info('Auto-saved!');
            }, AUTOSAVE_DELAY);
        }
    };

    const handleLanguageSelect = (newLanguage) => {
        setLanguage(newLanguage);
        if (socket) {
            socket.emit('language-change', { roomId, language: newLanguage });
            saveCode(code, newLanguage);
            toast.success('Language changed and saved!');
        }
    };

    // Handler for sending a chat message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (currentMessage.trim() && socket && user) {
            const messageData = {
                roomId,
                message: currentMessage,
                user: { name: user.name }
            };
            // console.log('Sending message to server:', messageData);
            socket.emit('send-message', messageData);
            setCurrentMessage('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <h1 className="text-lg font-bold cursor-pointer" onClick={() => navigate('/')}>CodeShare</h1>
                <div className="flex items-center gap-4">
                    <Select value={language} onValueChange={handleLanguageSelect}>
                        <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            {languages.map(lang => (
                                <SelectItem key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => saveCode(code, language)}>Save</Button>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden">
                {/* Editor Panel */}
                <div className="w-3/4 flex-shrink-0">
                    <Editor
                        height="100%"
                        language={language}
                        value={code}
                        theme="vs-dark"
                        onChange={handleEditorChange}
                    />
                </div>

                {/* Chat Panel */}
                <div className="w-1/4 flex flex-col bg-gray-800 border-l border-gray-700">
                    <div className="flex-grow p-4 overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4 border-b border-gray-600 pb-2">Chat Room</h2>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex flex-col ${msg.socketId === socket.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${msg.socketId === socket.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                        <p className="text-xs font-semibold text-yellow-300">{msg.user.name}</p>
                                        <p className="text-sm">{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2">
                        <Input
                            type="text"
                            placeholder={user ? "Type a message..." : "Log in to chat"}
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                            disabled={!user}
                        />
                        <Button type="submit" disabled={!user || !currentMessage.trim()}>Send</Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
