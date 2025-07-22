import express from 'express';
import { loginUser, registerUser } from '../controllers/User.controller';

const router = express.Router();

router.post('/register',registerUser);

router.post('/login',loginUser);

export default router;