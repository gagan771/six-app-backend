import { supabaseAdmin } from "../config/supabase";
import { removeUserConnection } from "./userService";

export async function removeUserConnectionAndChat(userId1: string, userId2: string, chatId: string) {
  console.log("🔁 Starting removal process...");
  console.log("👤 userId1:", userId1);
  console.log("👤 userId2:", userId2);
  console.log("💬 chatId:", chatId);

  try {
    // 1. Remove the Neo4j connection: user1 → user2
    console.log("🧠 Removing Neo4j connection (user1 → user2)...");
    await removeUserConnection(userId1, userId2);
    console.log("✅ Neo4j connection removed.");

    // 2. Delete chat from Supabase
    console.log("🗑️ Deleting chat from Supabase...");
    const { error } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('chat_id', chatId);

    if (error) {
      throw new Error(`Failed to delete chat from Supabase: ${error.message}`);
    }

    console.log("✅ Chat deleted successfully from Supabase.");
    return { success: true };

  } catch (err) {
    console.error("🔥 Error in removeUserConnectionAndChat:", err);
    throw err;
  }
}
