import { Router } from 'express';
import { checkChatExsist } from '../controllers/chat.controller';

const router = Router();

router.get('/chat-exsist/:userId1/:userId2', checkChatExsist);

export default router;