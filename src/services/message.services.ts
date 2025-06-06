import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";
export const sendMessage = async (
    currentUserId: string,
    chatId: string,
    content: string
) => {
    try {
        const { error: messageError } = await supabaseAdmin
            .from('messages')
            .insert([
                {
                    chat_id: chatId,
                    sender_id: currentUserId,
                    content,
                },
            ]);

        if (messageError) {
            throw new Error(`Failed to send message: ${messageError.message}`);
        }

        return { success: true, message: 'Message sent successfully' };
    } catch (error) {
        await logger.error('sendMessage', 'Error sending message:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
        };
    }
};