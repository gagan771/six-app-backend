import { Request, Response } from 'express';
import { introduceUsersOpenai, suggestPostsToUserOpenai } from '../services/sixAi.services';
import { READ } from 'neo4j-driver/types/driver';

export const introduceUsers = async (req: Request, res: Response) => {
    const { userId1, userId2, postId, chatId } = req.body;
    const result =  await introduceUsersOpenai(userId1, userId2, postId, chatId);
    if (result.success) {
        res.json({ success: true, message: result.message, data: result.data });
    } else {
        res.status(500).json({ success: false, message: result.error });
    }
}

export const suggestPost = async (req: Request, res: Response) => {
    const { keyword_summary} = req.body;
    const result =  await suggestPostsToUserOpenai(keyword_summary);
    console.log(result)
    if (result.success) {
        res.json({ success: true, data: result.data });
    } else {
        res.status(500).json({ success: false, data: result.data });
    }
}   