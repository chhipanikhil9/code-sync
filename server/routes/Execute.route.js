import express from 'express';
import { executeCode } from '../controllers/Execute.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Ideally protected, but can be public for easier testing
router.post('/', protect, executeCode);

export default router;
