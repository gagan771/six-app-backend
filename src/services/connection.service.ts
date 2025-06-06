import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";
import { removeUserConnection } from "./userService";

export async function removeUserConnectionAndChat(userId1: string, userId2: string, chatId: string) {
  try {
    // 1. Remove the Neo4j connection: user1 → user2
    await removeUserConnection(userId1, userId2);

    // 2. Delete chat from Supabase
    const { error } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('chat_id', chatId);

    if (error) {
      throw new Error(`Failed to delete chat from Supabase: ${error.message}`);
    }
    return { success: true, message: `Removed ${userId1} ↔ ${userId2}` };       
  } catch (err: any) {
    await logger.error('removeUserConnectionAndChat', 'Error in removeUserConnectionAndChat:', err);
    return { success: false, error: err.message || 'Failed to remove connection and chat' };
  }
}
