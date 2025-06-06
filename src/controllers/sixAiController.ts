import { Request, Response } from 'express';
import { introduceUsersOpenai, suggestPostsToUserOpenai } from '../services/sixAi.services';

export const introduceUsers = async (req: Request, res: Response) => {
    const { userId1, userId2, postId, chatId } = req.body;
    const introduced =  await introduceUsersOpenai(userId1, userId2, postId, chatId);
    res.json({ message: `Introduced` });
}

export const suggestPost = async (req: Request, res: Response) => {
    const { keyword_summary} = req.body;
    const suggestion =  await suggestPostsToUserOpenai(keyword_summary);
    res.json({ message: suggestion });
}   