import express from 'express';
import { getRoom, createRoom } from '../controllers/Room.controller.js';

const router = express.Router();

router.get('/:id', getRoom);
router.post('/new', createRoom);

export default router;