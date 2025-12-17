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
import { Copy, Play, Loader2, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
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

const AudioPlayer = ({ stream }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay />;
};

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
    const { user, logout } = useAuth();

    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem(`chat_${roomId}`) || '[]'));
    const [currentMessage, setCurrentMessage] = useState('');
    const [generatedQuestion, setGeneratedQuestion] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState(null);
    const [userInput, setUserInput] = useState('');

    const socketRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef({}); // Store decoration IDs per user: { socketId: [id1, id2] }

    // Voice Call State
    const [isVoiceJoined, setIsVoiceJoined] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream }]
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // { [socketId]: RTCPeerConnection }
    const usersInRoomRef = useRef([]); // Keep track of all users to connect to


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

        // Update state on cursor move
        socket.on('cursor-update', ({ socketId, cursor }) => {
            if (socketId === socket.id) return;

            if (!editorRef.current || !monacoRef.current) return;

            const editor = editorRef.current;
            const monaco = monacoRef.current;

            const newDecorations = [{
                range: new monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column),
                options: {
                    className: 'remote-cursor',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }];

            const previousIds = decorationsRef.current[socketId] || [];
            decorationsRef.current[socketId] = editor.deltaDecorations(previousIds, newDecorations);
        });

        // --- Voice Call & User Tracking ---
        socket.on('existing-users', (users) => {
            usersInRoomRef.current = users;
        });

        socket.on('user-connected', ({ socketId, user }) => {
            if (!usersInRoomRef.current.includes(socketId)) {
                usersInRoomRef.current.push(socketId);
            }
            toast.info(`${user?.name || 'A user'} joined the room`);
        });

        socket.on('offer', async (data) => {
            if (!isVoiceJoinedRef.current) return;
            await handleReceiveOffer(data.offer, data.sender);
        });

        socket.on('answer', async (data) => {
            if (!isVoiceJoinedRef.current) return;
            const peer = peersRef.current[data.sender];
            if (peer) {
                await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        socket.on('ice-candidate', async (data) => {
            if (!isVoiceJoinedRef.current) return;
            const peer = peersRef.current[data.sender];
            if (peer) {
                await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        socket.on('user-disconnected', (socketId) => {
            if (decorationsRef.current[socketId] && editorRef.current) {
                editorRef.current.deltaDecorations(decorationsRef.current[socketId], []);
                delete decorationsRef.current[socketId];
            }
            // Cleanup Voice
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
                setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
            }
            usersInRoomRef.current = usersInRoomRef.current.filter(id => id !== socketId);
            toast.info("A user disconnected");
        });

        return () => {
            socket.disconnect();
            leaveVoice();
        };
    }, [roomId, navigate]);

    const isVoiceJoinedRef = useRef(false);
    useEffect(() => { isVoiceJoinedRef.current = isVoiceJoined; }, [isVoiceJoined]);

    // Helper functions for WebRTC
    const createPeer = (targetSocketId, stream) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peer.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    target: targetSocketId,
                    candidate: event.candidate,
                    sender: socketRef.current.id
                });
            }
        };

        peer.ontrack = (event) => {
            setRemoteStreams(prev => {
                if (prev.some(s => s.socketId === targetSocketId)) return prev;
                return [...prev, { socketId: targetSocketId, stream: event.streams[0] }];
            });
        };

        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        return peer;
    };

    const handleReceiveOffer = async (offer, senderSocketId) => {
        if (!isVoiceJoinedRef.current) return;

        const stream = localStreamRef.current;
        if (!stream) return; // Should not happen if joined

        const peer = createPeer(senderSocketId, stream);
        peersRef.current[senderSocketId] = peer;

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current.emit('answer', {
            target: senderSocketId,
            answer,
            sender: socketRef.current.id
        });
    };

    const joinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            setIsVoiceJoined(true);

            // Initiate calls to all existing users
            usersInRoomRef.current.forEach(async (targetId) => {
                const peer = createPeer(targetId, stream);
                peersRef.current[targetId] = peer;

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                socketRef.current.emit('offer', {
                    target: targetId,
                    offer,
                    sender: socketRef.current.id
                });
            });
            toast.success("Joined Voice Channel");
        } catch (err) {
            console.error(err);
            toast.error("Failed to access microphone");
        }
    };

    const leaveVoice = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        Object.values(peersRef.current).forEach(peer => peer.close());
        peersRef.current = {};
        setRemoteStreams([]);
        setIsVoiceJoined(false);
    };



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

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        editor.onDidChangeCursorPosition((e) => {
            const cursor = e.position;
            if (socketRef.current) {
                socketRef.current.emit('cursor-move', {
                    roomId,
                    cursor,
                    userName: user?.name,
                    socketId: socketRef.current.id
                });
            }
        });
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

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput(null);
        try {
            const response = await axios.post(`${SOCKET_SERVER_URL}/api/execute`, {
                code,
                language,
                stdin: userInput
            }, { withCredentials: true });
            setOutput(response.data.run);
        } catch (error) {
            toast.error("Failed to run code");
            console.error(error);
            setOutput({ stderr: "Failed to execute code. Please try again." });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (currentMessage.trim() && socketRef.current && user) {
            socketRef.current.emit('send-message', { roomId, message: currentMessage, user: { name: user.name }, socketId: socketRef.current.id });
            setCurrentMessage('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-sm z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <code className="font-bold text-lg">C</code>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">CodeSync</h1>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 group hover:border-slate-600 transition-colors">
                        <span>Room:</span>
                        <span className="font-mono text-slate-200">{roomId}</span>
                        <Button
                            onClick={handleCopyRoomId}
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 ml-1 hover:bg-slate-700 rounded-full"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <AIQuestionGenerator onQuestionGenerated={handleQuestionGenerated} />

                    <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>

                    <Select value={language} onValueChange={handleLanguageSelect}>
                        <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200 focus:ring-blue-500/50 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            {languages.map(lang => (
                                <SelectItem key={lang} value={lang} className="focus:bg-slate-700 text-slate-200 cursor-pointer">
                                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/20 border-0 h-9 px-6 transition-all"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                        Run
                    </Button>

                    <Button
                        variant={isVoiceJoined ? "destructive" : "secondary"}
                        onClick={isVoiceJoined ? leaveVoice : joinVoice}
                        className={`h-9 border-0 transition-all ${isVoiceJoined ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        {isVoiceJoined ? <PhoneOff className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                        {isVoiceJoined ? 'Leave Voice' : 'Join Voice'}
                    </Button>

                    {user && (
                        <Button
                            variant="ghost"
                            onClick={logout}
                            className="text-slate-400 hover:text-red-400 hover:bg-red-950/30 h-9"
                        >
                            Logout
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content Info */}
            <div className="flex flex-grow overflow-hidden relative">

                {/* Audio Elements Holder */}
                {remoteStreams.map(s => (
                    <AudioPlayer key={s.socketId} stream={s.stream} />
                ))}

                {/* Left Panel: Problem Statement */}
                <div className="w-1/4 flex flex-col bg-slate-900 border-r border-slate-800 z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]">
                    <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Problem Statement
                        </h2>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        <QuestionDisplay question={generatedQuestion} />
                    </div>
                </div>

                {/* Middle Panel: Editor & Output */}
                <div className="w-1/2 flex-grow flex flex-col min-w-0 bg-[#1e1e1e]">
                    {/* Editor Container */}
                    <div className="flex-grow shadow-inner relative">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            onChange={handleEditorChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                fontLigatures: true,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 16, bottom: 16 },
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                            }}
                        />
                    </div>

                    {/* Output Panel (Terminal-like) */}
                    <div className="h-[35%] bg-slate-950 border-t border-slate-800 flex flex-col shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.5)] z-10">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Console</span>
                            </div>
                        </div>
                        <div className="flex-grow flex overflow-hidden">
                            {/* Input Section */}
                            <div className="w-1/2 flex flex-col border-r border-slate-800">
                                <div className="px-4 py-1 bg-slate-900/50 border-b border-slate-800/50">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">Input</span>
                                </div>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="Enter input here..."
                                    className="flex-grow w-full bg-slate-950 text-slate-300 font-mono text-sm p-3 resize-none focus:outline-none custom-scrollbar placeholder:text-slate-700"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Output Section */}
                            <div className="w-1/2 flex flex-col">
                                <div className="px-4 py-1 bg-slate-900/50 border-b border-slate-800/50">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">Output</span>
                                </div>
                                <div className="flex-grow p-4 overflow-y-auto font-mono text-sm custom-scrollbar">
                                    {output ? (
                                        <div className="space-y-2">
                                            {output.stdout && (
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-green-500 text-xs mt-[3px]">➜</span>
                                                        <pre className="whitespace-pre-wrap text-slate-300">{output.stdout}</pre>
                                                    </div>
                                                </div>
                                            )}
                                            {output.stderr && (
                                                <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex items-start gap-2 text-red-400">
                                                        <span className="font-bold">Error:</span>
                                                        <pre className="whitespace-pre-wrap text-sm">{output.stderr}</pre>
                                                    </div>
                                                </div>
                                            )}
                                            {!output.stdout && !output.stderr && (
                                                <div className="text-slate-600 italic text-xs">Program finished with no output.</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                            <div className="mb-2 opacity-50">
                                                <Play className="w-8 h-8" />
                                            </div>
                                            <p>Run your code to see result...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chat */}
                <div className="w-1/4 flex flex-col bg-slate-900 border-l border-slate-800 z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.5)]">
                    <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Live Chat
                        </h2>
                    </div>

                    <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-900/30">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-600 mt-10 text-sm">
                                <p>No messages yet.</p>
                                <p>Say hello to your team!</p>
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const isMe = msg.socketId === socketRef.current?.id;
                            return (
                                <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in zoom-in-95 duration-200`}>
                                    <div className={`
                                        max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                                        ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'}
                                    `}>
                                        {!isMe && <p className="text-[10px] font-bold text-blue-400 mb-1 opacity-80">{msg.user?.name || 'User'}</p>}
                                        <p className="leading-relaxed">{msg.message}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-600 mt-1 px-1">
                                        {isMe ? 'You' : ''}
                                    </span>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-slate-900 border-t border-slate-800">
                        <form onSubmit={handleSendMessage} className="relative">
                            <Input
                                type="text"
                                placeholder={user ? "Type a message..." : "Log in to chat"}
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200 pr-12 rounded-full focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-slate-600"
                                disabled={!user}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!user || !currentMessage.trim()}
                                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
