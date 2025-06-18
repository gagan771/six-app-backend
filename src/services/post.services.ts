import { supabaseAdmin } from "../config/supabase";
import { getChatExsist } from "./chat.service";
import { logger } from "./log.services";
import { generateConnectionHighlight } from "./request.service";
import { getConnectionDegree, getMutualConnectionsCount } from "./userService";

export async function getUserConnectionRequests(userId: string, userName: string) {
  try {
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
    if (!data) return { success: true, message: 'No connection requests found', data: [] };

    const enriched = await Promise.all(
      data.map(async (request: any) => {
        const degree = await getConnectionDegree(request.reactor_id, userId);
        const mutuals = await getMutualConnectionsCount(request.reactor_id, userId);

        console.log(request.user)
        const keywords = Array.isArray(request.user?.keyword_summary)
          ? request.user.keyword_summary.map((k: string) => k.trim()).filter(Boolean)
          : [];

        const chatExsist = await getChatExsist(userId, request.reactor_id);

        let intro;
        if (chatExsist.success) {
          intro = `${request.user.name} is interested in your post.`;
        } else {
          intro = await generateConnectionHighlight({
            degree: degree.data ?? 0,
            mutuals: mutuals.data ?? 0,
            keywords: keywords ?? [],
          });
        }

        return {
          ...request,
          degree,
          mutuals,
          intro,
        };
      })
    );

    return { success: true, message: 'Connection requests fetched successfully', data: enriched };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch connection requests' };
  }
}


export async function getAllActivePosts(limit: number = 10) {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("posts")
      .select("id, content")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Supabase error fetching posts: ${error.message}`);
    }

    return { success: true, message: 'Posts fetched successfully', data: data || [] };
  } catch (error: any) {
    await logger.error('getAllActivePosts', 'Error fetching posts:', error);
    return { success: false, error: error.message || 'Failed to fetch posts' };
  }
}