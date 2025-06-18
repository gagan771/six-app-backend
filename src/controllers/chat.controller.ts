import { Request, Response } from 'express';
import { getChatExsist } from '../services/chat.service';

export const checkChatExsist = async (req: Request, res: Response) => {
  const { userId1, userId2 } = req.params;
  const result = await getChatExsist(userId1, userId2);
  res.json({ success: result.success, message: result.message, data: result.data });
};