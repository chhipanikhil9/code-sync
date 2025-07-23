import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const protect = async (req, res, next) => {
    let token;

    // Read the JWT from the 'jwt' cookie
    token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by the ID from the token's payload
            // and attach it to the request object, excluding the password
            req.user = await User.findById(decoded.id).select('-password');

            // Move on to the next function (the actual controller)
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export { protect };
