import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || 'us-east-2';
const TABLE_NAME = process.env.DYNAMO_TABLE || 'Otps';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
);

export interface OtpItem {
  phone: string;
  otp: string;
  ttl: number;
  createdAt: string;
}

export async function saveOtp(phone: string, otp: string, ttlSeconds = 300): Promise<{ success: boolean; error?: string }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + ttlSeconds;
    const createdAt = new Date().toISOString();

    const item: OtpItem = { phone, otp, ttl, createdAt };

    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error saving OTP:', err.message || err);
    return { success: false, error: 'Failed to save OTP' };
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  try {
    const res = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { phone },
      })
    );

    if (!res.Item) return false;

    const item = res.Item as OtpItem;
    const now = Math.floor(Date.now() / 1000);

    const isMatch = item.otp === otp && item.ttl > now;

    if (isMatch) {
      await deleteOtp(phone); // clean up after successful verification
    }

    return isMatch;
  } catch (err: any) {
    console.error('Error verifying OTP:', err.message || err);
    return false;
  }
}

export async function deleteOtp(phone: string): Promise<void> {
  try {
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { phone },
      })
    );
  } catch (err: any) {
    console.error('Error deleting OTP:', err.message || err);
  }
}
