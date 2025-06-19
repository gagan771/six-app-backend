import { Request, Response } from 'express';
import { createChatAndIntroMessage } from '../services/chat.service';

export const createChatAndIntroMessageController = async (req: Request, res: Response) => {
  const { userId1, userId2, postId, chatId, postReactionId } = req.body;
  const result = await createChatAndIntroMessage  (userId1, userId2, postId, chatId, postReactionId);
  res.json({ success: result?.success, message: result?.message, data: result?.data });
};