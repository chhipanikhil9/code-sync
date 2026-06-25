import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import AIQuestionGenerator from './AIQuestionGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'react-toastify';

const languages = ['javascript', 'python', 'java', 'cpp'];

const Header = ({ roomId, language, onLanguageChange, onQuestionGenerated }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Failed to log out');
        }
    };

    return (
        <header className="bg-gray-800 text-white shadow-md">
            <div className="flex items-center justify-between gap-4 p-4">
                <Link to="/" className="text-xl font-bold">
                    CodeSync
                </Link>
                <nav>
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="font-medium">Welcome, {user.name}</span>
                            <Button onClick={handleLogout} variant="secondary">
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Button asChild variant="ghost">
                                <Link to="/login">Login</Link>
                            </Button>
                            <Button asChild>
                                <Link to="/signup">Sign Up</Link>
                            </Button>
                        </div>
                    )}
                </nav>
            </div>

            {roomId && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0 bg-gray-700 px-4 py-2 rounded-md max-w-full">
                        <span className="text-sm font-mono truncate">{roomId}</span>
                        <Button onClick={() => navigator.clipboard.writeText(roomId)} size="icon" variant="ghost">
                            <span className="sr-only">Copy room ID</span>
                            ⧉
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
                        {onQuestionGenerated && <AIQuestionGenerator onQuestionGenerated={onQuestionGenerated} />}
                        {language && onLanguageChange && (
                            <Select value={language} onValueChange={onLanguageChange}>
                                <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {languages.map((lang) => (
                                        <SelectItem key={lang} value={lang}>
                                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
