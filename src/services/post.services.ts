import { supabaseAdmin } from "../config/supabase";
import { generateConnectionHighlight } from "./request.service";
import { getConnectionDegree, getMutualConnectionsCount } from "./userService";

export async function getUserConnectionRequests(userId: string, userName: string) {
  const { data, error } = await supabaseAdmin
    .from('post_reactions')
    .select(`
      id,
      reactor_id,
      post_owner_id,
      posts (
        id,
        content
      ),
      user:reactor_id (
        keyword_summary,
        name
      )
    `)
    .eq('interest', true)
    .eq('accepted', false)
    .eq('post_owner_id', userId);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) return [];

  const enriched = await Promise.all(
    data.map(async (request: any) => {
      const degree = await getConnectionDegree(request.reactor_id, userId);
      const mutuals = await getMutualConnectionsCount(request.reactor_id, userId);

      console.log("keyword_summary value:", request.user?.keyword_summary);

      const keywords = Array.isArray(request.user?.keyword_summary)
        ? request.user.keyword_summary.map((k: string) => k.trim()).filter(Boolean)
        : [];


      const intro = generateConnectionHighlight({
        degree: degree ?? 0,
        mutuals,
        keywords,
        postOwnerName: userName,
      });

      return {
        ...request,
        degree,
        mutuals,
        intro,
      };
    })
  );

  return enriched;
}


export async function getAllActivePosts(limit: number = 10) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, content")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase error fetching posts: ${error.message}`);
  }

  return data || [];
}