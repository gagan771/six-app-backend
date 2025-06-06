import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";

export async function getUserDetailsFromSupabase(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, keyword_summary")
      .eq("id", userId)
      .single();

  if (error) {
    await logger.error('getUserDetailsFromSupabase', `Error fetching user ${userId}`, error);
    return { success: false, error: error.message || 'Failed to fetch user' };
  }
  return { success: true, message: 'User fetched successfully', data };
  } catch (error: any) {
    await logger.error('getUserDetailsFromSupabase', `Error fetching user ${userId}`, error);
    return { success: false, error: error.message || 'Failed to fetch user' };
  }
}

export async function getPostFromSupabase(postId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("posts")
      .select("id, content")
      .eq("id", postId)
      .single();

    if (error) {
      await logger.error('getPostFromSupabase', `Error fetching post ${postId}`, error);
      return { success: false, error: error.message || 'Failed to fetch post' };
    }
    return { success: true, message: 'Post fetched successfully', data };

  } catch (error: any) {
    await logger.error('getPostFromSupabase', `Error fetching post ${postId}`, error);
    return { success: false, error: error.message || 'Failed to fetch post' };
  }
}
