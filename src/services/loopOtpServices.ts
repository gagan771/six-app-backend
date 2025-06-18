import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const sendOutboundLoopOtp = async (phone: number, otp: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      'https://server.loopmessage.com/api/v1/message/send/',
      {
        recipient: phone,
        text: `Otp: ${otp}`,
        sender_name: process.env.LOOP_SENDER_NAME,
        service: 'imessage',
      },
      {
        headers: {
          Authorization: process.env.LOOP_AUTHORIZATION_KEY || '',
          'Loop-Secret-Key': process.env.LOOP_SECRET_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.success) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
};
