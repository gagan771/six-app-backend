import express from 'express';
import { processInboundMessage, requestOtp, verifyOtp } from '../controllers/otpController';

const router = express.Router();

router.post('/loop-inbound', processInboundMessage);
router.post('/request', requestOtp);
router.post('/verify', verifyOtp);  

export default router;