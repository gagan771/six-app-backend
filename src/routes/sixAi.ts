import { Router } from 'express';
import { introduceUsers, suggestPost } from '../controllers/sixAiController';

const router = Router();

router.post('/introduce', introduceUsers);
router.post('/suggestion', suggestPost);

export default router;
