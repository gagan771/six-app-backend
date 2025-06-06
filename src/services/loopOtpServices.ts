import axios from 'axios';

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
      console.log('OTP sent successfully');
      return true;
    } else {
      console.error('Failed to send OTP:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending OTP via Loop:', error.response?.data || error.message);
    return false;
  }
};
