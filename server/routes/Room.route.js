import express from 'express';
import { getRoom, createRoom } from '../controllers/Room.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:id', getRoom);
router.post('/new', protect, createRoom);

export default router;