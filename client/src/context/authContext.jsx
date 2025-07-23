import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// 1. Create the context
const AuthContext = createContext();

// 2. Create a custom hook to use the context easily
export const useAuth = () => {
    return useContext(AuthContext);
};

// 3. Create the Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // This effect will run once on initial app load to check if a user is already logged in
    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                axios.defaults.withCredentials = true;
                const response = await axios.get('http://localhost:3001/api/users/profile');
                setUser(response.data);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        axios.defaults.withCredentials = true;
        const response = await axios.post('http://localhost:3001/api/users/login', { email, password });
        setUser(response.data);
        return response.data;
    };

    const signup = async (name, email, password) => {
        axios.defaults.withCredentials = true;
        const response = await axios.post('http://localhost:3001/api/users/register', { name, email, password });
        setUser(response.data);
        return response.data;
    };

    const logout = async () => {
        axios.defaults.withCredentials = true;
        await axios.post('http://localhost:3001/api/users/logout');
        setUser(null);
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
        signup,
    };

    // We only render the children after we've checked for a logged-in user
    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
