import User from '../models/User.model.js'

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
}

// @route   POST /api/users/register
export const registerUser = async (req, res) => {
    const { userName, email, password } = req.body;

    try {
        const userExists = await User.find({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = await User.create({
            userName,
            email,
            password
        });
        if (newUser) {
            res.status(201).json({
                _id: newUser._id,
                userName: newUser.userName,
                email: newUser.email,
                token: generateToken(newUser._id)
            });
        }
        else {
            res.status(400).json({ message: 'User registration failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


// @route   POST /api/users/login
export const loginUser = async (req,res)=>{
    const {email,password} = req.body;

    try {
        const user = await User.findOne({email});
        if(user && (await user.comparePassword(password))){
            res.status(200).json({
                _id: user._id,
                userName: user.userName,
                email: user.email,
                token: generateToken(user._id)
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
        
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

