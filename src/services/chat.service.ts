import { supabaseAdmin } from "../config/supabase";

export const getChatExsist = async (userId1: string, userId2: string) => {
    try {
        const chatId = [userId1, userId2].sort().join('_');
        console.log('chatId', chatId)
        const { data, error } = await supabaseAdmin
            .from('chats')
            .select('chat_id')
            .eq('chat_id', chatId);

        if (error) {
            throw error;
        }

        if (data.length > 0) {
            return { success: true, message: 'Chat exsist', data: data[0] };
        }
        return { success: false, message: 'Chat does not exsist', data: null };
    } catch (error) {
        return { success: false, message: 'Chat does not exsist', data: null };
    }
};