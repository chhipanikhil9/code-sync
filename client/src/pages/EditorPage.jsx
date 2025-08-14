import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

import AIQuestionGenerator from '../components/AIQuestionGenerator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from 'lucide-react';
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

const QuestionDisplay = ({ question }) => {
    if (!question) {
        return (
            <div className="p-4 text-gray-400 h-full">
                <h2 className="text-xl font-bold mb-2 text-yellow-400">Problem Details</h2>
                <p className="text-sm">Click "Generate AI Question" to get started.</p>
            </div>
        );
    }
    return (
        <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-xl font-bold mb-2 text-yellow-400">{question.problemTitle}</h2>
            <p className="text-sm mb-4 whitespace-pre-wrap">{question.problemStatement}</p>
            <h3 className="font-semibold mb-2">Constraints:</h3>
            <ul className="list-disc list-inside mb-4 text-sm space-y-1">
                {Array.isArray(question.constraints) && question.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <h3 className="font-semibold mb-2">Test Cases:</h3>
            <div className="space-y-3 text-sm">
                {Array.isArray(question.testCases) && question.testCases.map((tc, i) => (
                    <div key={i} className="bg-gray-900 p-3 rounded-md font-mono">
                        <p className="font-semibold">Example {i + 1}:</p>
                        <code className="block whitespace-pre-wrap mt-1"><span className="text-gray-400">Input:</span> {tc.input}</code>
                        <code className="block whitespace-pre-wrap mt-1"><span className="text-gray-400">Output:</span> {tc.output}</code>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EditorPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem(`chat_${roomId}`) || '[]'));
    const [currentMessage, setCurrentMessage] = useState('');
    const [generatedQuestion, setGeneratedQuestion] = useState(null);

    const socketRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const socket = io(SOCKET_SERVER_URL, { withCredentials: true });
        socketRef.current = socket;

        axios.get(`${SOCKET_SERVER_URL}/api/rooms/${roomId}`)
            .then(res => {
                setCode(res.data.code);
                setLanguage(res.data.language);
                if (res.data.generatedQuestion) {
                    setGeneratedQuestion(res.data.generatedQuestion);
                }
            })
            .catch(() => { toast.error("Room not found."); navigate('/'); });

        socket.emit('join-room', { roomId, user });

        socket.on('room-full', () => {
            toast.error("This room is full.");
            navigate('/');
        });

        socket.on('receive-code-change', setCode);
        socket.on('receive-language-change', setLanguage);
        socket.on('receive-message', (data) => setMessages(prev => [...prev, data]));
        socket.on('receive-question', (question) => {
            toast.info("A new question has been generated!");
            setGeneratedQuestion(question);
        });

        return () => { socket.disconnect(); };
    }, [roomId, navigate]);

    useEffect(() => {
        localStorage.setItem(`chat_${roomId}`, JSON.stringify(messages));
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, roomId]);

    const handleQuestionGenerated = (question) => {
        setGeneratedQuestion(question);
        if (socketRef.current) {
            socketRef.current.emit('question-generated', { roomId, question });
        }
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        toast.success("Room ID copied to clipboard!");
    };

    const handleLanguageSelect = (newLanguage) => {
        setLanguage(newLanguage);
        if (socketRef.current) {
            socketRef.current.emit('language-change', { roomId, language: newLanguage });
        }
    };

    const handleEditorChange = (value) => {
        setCode(value);
        if (!socketRef.current) return;
        socketRef.current.emit('code-change', { roomId, code: value });
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            socketRef.current.emit('save-code', { roomId, code, language });
        }, AUTOSAVE_DELAY);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (currentMessage.trim() && socketRef.current && user) {
            socketRef.current.emit('send-message', { roomId, message: currentMessage, user: { name: user.name }, socketId: socketRef.current.id });
            setCurrentMessage('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold cursor-pointer" onClick={() => navigate('/')}>CodeShare</h1>
                    <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-md">
                        <span className="text-sm font-mono px-2">{roomId}</span>
                        <Button onClick={handleCopyRoomId} size="icon" variant="ghost"><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <AIQuestionGenerator onQuestionGenerated={handleQuestionGenerated} />
                    <Select value={language} onValueChange={handleLanguageSelect}>
                        <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{languages.map(lang => <SelectItem key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden">
                <div className="w-1/4 flex flex-col bg-gray-800 border-r border-gray-700">
                    <QuestionDisplay question={generatedQuestion} />
                </div>
                <div className="w-1/2 flex-grow">
                    <Editor height="100%" language={language} value={code} theme="vs-dark" onChange={handleEditorChange} />
                </div>
                <div className="w-1/4 flex flex-col bg-gray-800 border-l border-gray-700">
                    <div className="flex-grow p-4 overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4 pb-2">Chat Room</h2>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex flex-col ${msg.socketId === socketRef.current?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${msg.socketId === socketRef.current?.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                        <p className="text-xs font-semibold text-yellow-300">{msg.user?.name || 'User'}</p>
                                        <p className="text-sm">{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2">
                        <Input type="text" placeholder={user ? "Type..." : "Log in to chat"} value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} className="bg-gray-700" disabled={!user} />
                        <Button type="submit" disabled={!user || !currentMessage.trim()}>Send</Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
