import driver from "../config/neo4j";
import { supabaseAdmin } from "../config/supabase";

// Enhanced fallback that fetches one extra post to check for more
export async function getFallbackPostsWithExtra(
  userId: string,
  eligibleUserIds: string[],
  chatUserIds: string[],
  userDegreeMap: Map<string, number>,
  offset: number,
  limit: number
): Promise<any[]> {
  
  // Fetch more posts to account for filtering, plus one extra
  const batchMultiplier = Math.max(3, Math.ceil(100 / Math.max(eligibleUserIds.length, 1)));
  const batchSize = (limit + 1) * batchMultiplier; // +1 for hasMore check
  
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select(`
      id, user_id, content, category, hide_from_chat, expires_at, locked, created_at, connection_type,
      user:users!user_id (keyword_summary),
      post_reactions!left (
      reactor_id, interest, accepted
    )
    `)
    .in('user_id', eligibleUserIds)
    .order('created_at', { ascending: false })
    .range(0, offset + batchSize);
  
  if (error) throw error;
  if (!posts) return [];
  
  // Apply connection_type and chat filtering
  const filteredPosts = posts.filter(post => {
    const posterDegree = userDegreeMap.get(post.user_id) ?? 0;
    
    // Check connection_type visibility rules
    if (post.user_id !== userId) {
      const maxAllowedDegree = parseInt(post.connection_type) || 3;
      if (posterDegree > maxAllowedDegree) return false;
    }
    
    // Apply hide_from_chat logic
    if (post.hide_from_chat && !chatUserIds.includes(post.user_id)) {
      return false;
    }
    
    return true;
  });
  
  // Apply pagination and get one extra for hasMore check
  const paginatedPosts = filteredPosts.slice(offset, offset + limit + 1);
  
  // Format the posts
  return paginatedPosts.map(post => {
   const userReaction = post.post_reactions.find((r: any) => r.reactor_id === userId);
    const degree = userDegreeMap.get(post.user_id) ?? 0;
    
    return {
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      category: post.category,
      hide_from_chat: post.hide_from_chat,
      expires_at: post.expires_at,
      locked: post.locked,
      created_at: post.created_at,
      connection_type: post.connection_type,
      connectionType: degree === 0 ? "0" : String(degree),
      keyword_summary: post.user?.[0]?.keyword_summary || null,
      user_interested: userReaction?.interest ?? false,
      user_accepted: userReaction?.accepted ?? false,
    };
  });
}

// Utility function to get total count (optional, for showing "X of Y posts")
export async function getConnectedPostsCount(
  userId: string,
  degreeFilter: number
): Promise<number> {
  const session = driver.session();
  
  try {
    // Get eligible user IDs (same logic as main function)
    const neo4jResult = await session.run(
      `
      MATCH (u:User {id: $userId})
      MATCH path = (u)-[:CONNECTED_TO*1..3]->(other:User)
      WHERE u.id <> other.id
      WITH other.id AS connectionId, length(path) AS degree
      ORDER BY degree
      WITH connectionId, min(degree) AS degree
      RETURN connectionId, degree
      UNION
      RETURN $userId AS connectionId, 0 AS degree
      `,
      { userId }
    );
    
    const connections = neo4jResult.records.map(record => ({
      connectionId: record.get('connectionId'),
      degree: record.get('degree').toInt(),
    }));

    let eligibleConnections = connections;
    if (typeof degreeFilter === 'number' && degreeFilter > 0) {
      eligibleConnections = connections.filter(c => c.degree === degreeFilter);
    }
    const eligibleUserIds = eligibleConnections.map(c => c.connectionId);
    
    // Get count from Supabase
    const { count, error } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('user_id', eligibleUserIds);
    
    if (error) throw error;
    return count || 0;
    
  } finally {
    await session.close();
  }
}