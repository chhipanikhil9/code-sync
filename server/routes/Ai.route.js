import express from 'express';
import { generateQuestion } from '../controllers/Ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// This route is protected. Only authenticated users can generate questions.
router.post('/generate-question',protect , generateQuestion);

export default router;
