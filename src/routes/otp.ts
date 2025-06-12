import express from 'express';
import { processInboundMessage, processOutboundMessage, verifyOtp } from '../controllers/otpController';

const router = express.Router();

router.post('/loop-inbound', processInboundMessage);
router.post('/request', processOutboundMessage);
router.post('/verify', verifyOtp);  

export default router;