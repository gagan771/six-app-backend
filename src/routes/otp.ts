import express, { Request, Response } from 'express';
import { generateOtp } from '../utils/generateOtp';
import { saveOtp, verifyOtp } from '../services/dynamoOtpService';
import { sendOutboundLoopOtp } from '../services/loopOtpServices';
import { loginOrCreateUser } from '../services/supabaseUserService';

const router = express.Router();

router.post('/loop-inbound', async (req: Request, res: Response): Promise<any> => {
  const { alert_type, recipient, text, message_type, message_id, webhook_id, api_version } = req.body;

  console.log('request received inbound msg', req.body)

  if (alert_type === 'message_inbound') {
    // Process the inbound message here
    console.log(`Received message from ${recipient}: ${text}`);
    // Sending the outbound top
    const otp = generateOtp();
    const data = await sendOutboundLoopOtp(recipient, otp);
    console.log('otp sent data', data)
  }

  // Respond with 200 OK to acknowledge receipt
  res.sendStatus(200);
});


router.post('/request', async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = generateOtp();

    await saveOtp(phone, otp);

    console.log(`Sending OTP ${otp} to phone ${phone}`);

    return res.json({ message: 'OTP sent successfully', otp: otp });
  } catch (err) {
    console.error('err', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/verify', async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const isValid = await verifyOtp(phone, otp)

    if (!isValid) {
      return res.status(400).json({ valid: false, error: `Invalid or expired OTP` });
    }

    const result = await loginOrCreateUser(phone);

    if (!result?.success) {
      return res.status(400).json({ valid: false, error: result?.error });
    }

    return res.json({
      valid: true,
      message: 'OTP verified successfully',
      session: result.session,
      user: result.user,
      isNewUser: result.isNewUser
    });

  } catch (err: any) {
    console.error('Unexpected error:', err.message || err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
