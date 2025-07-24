import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { logger } from "./log.services";
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

export type OtpResponse = { success: boolean; message?: string; data?: any; error?: string }

export async function saveOtp(phone: string, otp: string, ttlSeconds = 300): Promise<OtpResponse> {
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

    return { success: true, message: 'OTP saved successfully' };
  } catch (err: any) {
    await logger.error('saveOtp', 'Error saving OTP:', err);
    return { success: false, error: 'Failed to save OTP' };
  }
}

export async function verifyOtpFromDynamo(phone: string, otp: string): Promise<OtpResponse> {
  try {
    const res = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { phone },
      })
    );

    if (!res.Item) {
      return { success: false, error: 'OTP not found' };
    }

    const item = res.Item as OtpItem;
    const now = Math.floor(Date.now() / 1000);

    const isMatch = item.otp === otp && item.ttl > now;

    if (isMatch) {
      await deleteOtp(phone);
      return { success: true, message: 'OTP verified successfully', data: isMatch };
    }

    return { success: false, error: 'Invalid OTP' };
  } catch (err: any) {
    await logger.error('verifyOtp', 'Error verifying OTP:', err);
    return { success: false, error: 'Failed to verify OTP' };
  }
}

export async function deleteOtp(phone: string): Promise<OtpResponse> {
  try {
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { phone },
      })
    );
    return { success: true, message: 'OTP deleted successfully' };
  } catch (err: any) {
    await logger.error('deleteOtp', 'Error deleting OTP:', err);
    return { success: false, error: 'Failed to delete OTP' };
  }
}
