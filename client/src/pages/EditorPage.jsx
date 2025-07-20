// client/src/pages/EditorPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
const languages = ['javascript', 'python', 'java', 'cpp'];
const AUTOSAVE_DELAY = 2000; // 2 seconds

const EditorPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [socket, setSocket] = useState(null);
    const saveTimeoutRef = useRef(null); // Ref to hold the debounce timer

    // Effect for initializing the socket connection
    useEffect(() => {
        const s = io(SOCKET_SERVER_URL);
        setSocket(s);
        return () => {
            s.disconnect();
        };
    }, []);

    // Effect for fetching initial data and setting up socket listeners
    useEffect(() => {
        if (!socket || !roomId) return;

        axios.get(`${SOCKET_SERVER_URL}/api/rooms/${roomId}`)
            .then(response => {
                const { code: initialCode, language: initialLanguage } = response.data;
                setCode(initialCode);
                setLanguage(initialLanguage);
            })
            .catch(error => {
                console.error("Failed to fetch room", error);
                toast.error("Room not found. Redirecting to homepage.");
                navigate('/');
            });

        socket.emit('join-room', roomId);

        const handleCodeChange = (receivedCode) => setCode(receivedCode);
        socket.on('receive-code-change', handleCodeChange);

        const handleLanguageChange = (receivedLanguage) => setLanguage(receivedLanguage);
        socket.on('receive-language-change', handleLanguageChange);

        return () => {
            socket.off('receive-code-change', handleCodeChange);
            socket.off('receive-language-change', handleLanguageChange);
        };
    }, [socket, roomId, navigate]);

    // Reusable save function
    const saveCode = (currentCode, currentLanguage) => {
        if (socket) {
            socket.emit('save-code', { roomId, code: currentCode, language: currentLanguage });
        }
    };

    const handleEditorChange = (value) => {
        setCode(value);
        if (socket) {
            socket.emit('code-change', { roomId, code: value });

            // Debounced auto-save logic
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current); // Clear previous timer
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveCode(value, language);
                // toast.info('Auto-saved!');
            }, AUTOSAVE_DELAY);
        }
    };

    const handleLanguageSelect = (newLanguage) => {
        setLanguage(newLanguage);
        if (socket) {
            socket.emit('language-change', { roomId, language: newLanguage });
            // Immediately save on language change
            saveCode(code, newLanguage);
            // toast.success('Language changed and saved!');
        }
    };

    const handleManualSave = () => {
        // Clear any pending auto-save timers
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveCode(code, language);
        toast.success('Code saved!');
    };

    // Cleanup timer on component unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);


    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <h1 className="text-lg font-bold cursor-pointer" onClick={() => navigate('/')}>CodeShare</h1>
                <div className="flex items-center gap-4">
                    <Select value={language} onValueChange={handleLanguageSelect}>
                        <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            {languages.map(lang => (
                                <SelectItem key={lang} value={lang}>
                                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleManualSave}>Save</Button>
                </div>
            </header>
            <main className="flex-grow">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                />
            </main>
        </div>
    );
};

export default EditorPage;