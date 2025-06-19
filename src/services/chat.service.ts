import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";
import { deleteReaction } from "./request.service";
import { introduceUsersOpenai } from "./sixAi.services";
import { createBidirectionalConnection } from "./userService";

export const getChatExsist = async (userId1: string, userId2: string) => {
    try {
        const chatId = [userId1, userId2].sort().join('_');
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

export const createChatAndIntroMessage = async (userId1: string, userId2: string, postId: string, chatId: string, postReactionId: string) => {
    try {
        // 1. Create or get existing chat using upsert
        const { data: chatData, error: chatError } = await supabaseAdmin
            .from('chats')
            .upsert({
                chat_id: chatId,
                user1: userId1 < userId2 ? userId1 : userId2,
                user2: userId1 < userId2 ? userId2 : userId1,
            })
            .select()
            .single();

        if (chatError) {
            await logger.error('createChatAndIntroMessage', `Error upserting chat between users ${userId1} and ${userId2}`, chatError);
            return { success: false, message: 'Failed to create chat', data: null };
        }

        // 2. Create bidirectional connection
        const connectionResult = await createBidirectionalConnection(userId1, userId2);
        if (!connectionResult.success) {
            await logger.error('createChatAndIntroMessage', `Error creating bidirectional connection between users ${userId1} and ${userId2}`, connectionResult.error);
            return { success: false, message: 'Failed to create bidirectional connection', data: null };
        }

        // 3. Generate intro message in background
        setImmediate(async () => {
            try {
                const result = await introduceUsersOpenai(userId1, userId2, postId, chatId);
                if (!result.success) {
                    await logger.error('introGeneration', `Failed to generate intro for chat ${chatId}: ${result.error}`);
                }
            } catch (error) {
                await logger.error('introGeneration', `Unexpected error for chat ${chatId}:`, error);
            }
        });

        // 4. Delete reaction
        const deleteReactionResult = await deleteReaction(postReactionId);
        if (!deleteReactionResult.success) {
            await logger.error('createChatAndIntroMessage', `Error deleting reaction ${postReactionId}`, deleteReactionResult.error);
            return { success: false, message: 'Failed to delete reaction', data: null };
        }

        return { success: true, message: 'Chat created successfully', data: chatData?.chat_id };

    } catch (error: any) {
        await logger.error('createChatAndIntroMessage', `Error creating chat and intro message between users ${userId1} and ${userId2}`, error);
        return { success: false, message: 'Failed to create chat', data: null };
    }
};