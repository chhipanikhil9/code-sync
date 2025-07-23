import User from '../models/User.model.js'
import jwt from 'jsonwebtoken';

const generateTokenAndSetCookie = (res, userId) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
    // console.log('Generated JWT token:', token);

    res.cookie('jwt', token, {
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        sameSite: 'strict', // Prevents CSRF attacks
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
}

// @route   POST /api/users/register
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });
        // console.log('Registering user:', { name, email ,userExists});

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = await User.create({ name, email, password });
        if (newUser) {
            // console.log('New user created:', newUser);
            generateTokenAndSetCookie(res, newUser._id);
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            });
        }
        else {
            res.status(400).json({ message: 'User registration failed' });
        }
    } catch (error) {
        console.log('Error during user registration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


// @route   POST /api/users/login
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user && (await user.comparePassword(password))) {
            generateTokenAndSetCookie(res, user._id);
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// @route   POST /api/users/logout
export const logoutUser = (req, res) => {
    // To log out, we replace the 'jwt' cookie with an empty one that expires immediately.
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @route   GET /api/users/profile
export const getUserProfile = (req, res, next) => {
    if (req.user) {
        res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
}

