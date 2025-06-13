import { supabaseAdmin } from '../config/supabase';
import dotenv from 'dotenv';
dotenv.config();

interface LogEntry {
    function_name: string;
    message: string;
    details?: any;
}

class LogService {
    private isProduction = process.env.NODE_ENV === 'production';

    async log(functionName: string, message: string, details?: any) {
        const logEntry: LogEntry = {
            function_name: functionName,
            message,
            details: details ? JSON.stringify(details) : null
        };

        if (!this.isProduction) {
            console.log(`[${functionName}] ${message}`, details || '');
        }

        if (this.isProduction) {
            try {
                await supabaseAdmin
                    .from('logs')
                    .insert(logEntry);
            } catch (error) {
                console.error('Failed to store log in Supabase:', error);
                console.log(`[${functionName}] ${message}`, details || '');
            }
        }
    }

    async info(functionName: string, message: string, details?: any) {
        await this.log(functionName, `INFO: ${message}`, details);
    }

    async error(functionName: string, message: string, details?: any) {
        await this.log(functionName, `ERROR: ${message}`, details);
    }

    async warn(functionName: string, message: string, details?: any) {
        await this.log(functionName, `WARN: ${message}`, details);
    }

    async debug(functionName: string, message: string, details?: any) {
        await this.log(functionName, `DEBUG: ${message}`, details);
    }
}

export const logger = new LogService();
