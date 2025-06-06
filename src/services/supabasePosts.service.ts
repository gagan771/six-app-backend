import { supabaseAdmin } from "../config/supabase";

export async function getUserDetailsFromSupabase(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, keyword_summary")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Supabase error fetching user:", error);
    return null;
  }
  return data;
}

export async function getPostFromSupabase(postId: string) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, content")
    .eq("id", postId)
    .single();

  if (error) {
    console.error("Supabase error fetching post:", error);
    return null;
  }
  return data;
}
