import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { toast } from 'react-toastify';

const Header = () => {
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
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
            <Link to="/" className="text-xl font-bold">
                CodeShare
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
        </header>
    );
};

export default Header;
