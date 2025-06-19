import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";
import { removeUserConnection } from "./userService";

export async function removeUserConnectionAndChat(userId1: string, userId2: string, chatId: string) {
  try {
    // 1. Remove the Neo4j connection: user1 → user2
    const connectionResult = await removeUserConnection(userId1, userId2);
    if (!connectionResult.success) {
      return { success: false, error: connectionResult.error };
    }

    // 2. Delete chat from Supabase
    const { error } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('chat_id', chatId);

    if (error) {
      await logger.error('removeUserConnectionAndChat', 'Failed to delete chat from Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: `Removed ${userId1} ↔ ${userId2}` };       
  } catch (err: any) {
    await logger.error('removeUserConnectionAndChat', 'Error in removeUserConnectionAndChat:', err);
    return { success: false, error: err.message || 'Failed to remove connection and chat' };
  }
}

export async function removeUserConnectionFromNeo4j(userId1: string, userId2: string) {
  try {
    await removeUserConnection(userId1, userId2);
    return { success: true, message: `Removed ${userId1} ↔ ${userId2}` };
  } catch (err: any) {
    await logger.error('removeUserConnection', 'Error in removeUserConnection:', err);
    return { success: false, error: err.message || 'Failed to remove connection' };
  }
}