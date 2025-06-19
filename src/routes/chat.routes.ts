import { Router } from 'express';
import { createChatAndIntroMessageController } from '../controllers/chat.controller';

const router = Router();

router.post('/create-chat-and-intro-message', createChatAndIntroMessageController);

export default router;