import { Request, Response } from "express";
import { generateOtp } from "../utils/generateOtp";
import { sendOutboundLoopOtp } from "../services/loopOtpServices";
import { saveOtp, verifyOtpFromDynamo } from "../services/dynamoOtpService";
import { loginOrCreateUser } from "../services/supabaseUserService";

export const processInboundMessage = async (req: Request, res: Response): Promise<any> => {
  const { alert_type, recipient, text } = req.body;
  if (alert_type === 'message_inbound') {
    const otp = generateOtp();
    const data = await sendOutboundLoopOtp(recipient, otp);
    const result = await saveOtp(recipient, otp);
    return res.status(200).json({ success: true, message: 'OTP sent successfully', otp: otp });
  }
  return res.status(200).json({ success: true, message: 'OTP sent successfully' });
}

export const requestOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = generateOtp();

    const result = await saveOtp(phone, otp);

    if (result.success) {
      return res.status(200).json({ success: true, message: 'OTP sent successfully', otp: otp });
    }
    else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error saving OTP' });
  }
}

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {   
      return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
    }

    const isValid = await verifyOtpFromDynamo(phone, otp);

    if (!isValid || !isValid.success) {
      return res.status(200).json({ success: false, error: 'Invalid OTP' });
    }

    const result = await loginOrCreateUser(phone);

    if (!result?.success) {
      return res.status(200).json({ success: false, error: result?.error });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      session: result.session,
      user: result.user,
      isNewUser: result.isNewUser
    });

  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}