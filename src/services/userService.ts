import driver from '../config/neo4j';
import { supabaseAdmin } from '../config/supabase';
import { PaginatedPostsResponse } from '../types/post.types';
import { getFallbackPostsWithExtra } from '../utils/postFallback';
import { logger } from './log.services';

export async function createUserNodeOnSignup(userId: string, name: string, phone: string) {
  console.log('Creating user node with backend:', { userId, name, phone });

  const session = driver.session();
  try {
    const query = `
      MERGE (u:User {id: $userId})
      SET u.name = $name, u.phone = $phone
    `;
    const params = { userId, name, phone };
    await session.run(query, params);

  } catch (error) {
    logger.error('createUserNodeOnSignup', 'Error creating user node:', error);
  } finally {
    await session.close();
  }
}


export async function addConnection(
  userId1: string,
  userId2: string,
) {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u1:User {id: $userId1})
      MATCH (u2:User {id: $userId2})
      MERGE (u1)-[:CONNECTED_TO]->(u2)
      `,
      { userId1, userId2 }
    );
  } catch (error) {
    logger.error('addConnection', `Error connecting user :`, error);
  } finally {
    await session.close();
  }
}


export async function getConnections(userId: string) {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      MATCH path = (u)-[:CONNECTED_TO*1..3]->(other:User)
      WHERE u.id <> other.id
      RETURN DISTINCT other.id AS connectionId, length(path) AS degree
      `,
      { userId }
    );

    return result.records.map(record => ({
      connectionId: record.get('connectionId'),
      degree: record.get('degree').toInt()
    }));
  } catch (error) {
    logger.error('createUserNodeOnSignup', 'Error creating user node:', error);
  } finally {
    await session.close();
  }
}

export async function getConnectionDegree(senderId: string, ownerId: string): Promise<number | null> {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (a:User {id: $senderId}), (b:User {id: $ownerId})
      MATCH path = shortestPath((a)-[:CONNECTED_TO*1..3]-(b))
      RETURN length(path) AS degree
      `,
      { senderId, ownerId }
    );

    const record = result.records[0];
    if (!record) return null;

    return record.get('degree').toInt();
  } catch (err) {
    console.error('Neo4j error:', err);
    return null;
  } finally {
    await session.close();
  }
}



export async function getMutualConnections(userId1: string, userId2: string) {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u1:User {id: $userId1})
      MATCH (u2:User {id: $userId2})
      MATCH path1 = (u1)-[:CONNECTED_TO*1..3]->(c:User)
      MATCH (u2)-[:CONNECTED_TO*1..3]->(c)
      WHERE c.id <> $userId1 AND c.id <> $userId2
      WITH c, min(length(path1)) AS degreeFromUser1
      RETURN DISTINCT c.id AS mutualId, degreeFromUser1 AS degree
      `,
      { userId1, userId2 }
    );

    return result.records.map(record => ({
      mutualId: record.get('mutualId'),
      degree: record.get('degree').toInt()
    }));
  } catch (error) {
    console.error('Error fetching mutuals:', error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function getMutualConnectionsCount(userId1: string, userId2: string): Promise<number> {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (u1:User {id: $userId1})-[:CONNECTED_TO*1..3]->(c:User),
            (u2:User {id: $userId2})-[:CONNECTED_TO*1..3]->(c)
      WHERE c.id <> $userId1 AND c.id <> $userId2
      RETURN count(DISTINCT c) AS mutualCount
      `,
      { userId1, userId2 }
    );
    return result.records[0].get('mutualCount').toInt();
  } finally {
    await session.close();
  }
}

export async function removeUserConnection(userId1: string, userId2: string) {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u1:User {id: $userId1})-[r:CONNECTED_TO]->(u2:User {id: $userId2})
      DELETE r
      `,
      { userId1, userId2 }
    );
  } catch (error) {
    logger.error('createUserNodeOnSignup', 'Error creating user node:', error);
  } finally {
    await session.close();
  }
}

export async function getConnectedPosts(
  userId: string,
  degreeFilter: number,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedPostsResponse> {
  const session = driver.session();
  const offset = (page - 1) * limit;
  try {
    // Get user connections with degrees (including self as degree 0)
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

    const userDegreeMap = new Map(connections.map(c => [c.connectionId, c.degree]));

    // Get bidirectional chat connections for hide_from_chat logic
    const chatResult = await session.run(
      `
      MATCH (u:User {id: $userId})-[:CONNECTED_TO]->(other:User)-[:CONNECTED_TO]->(u)
      RETURN collect(other.id) AS chatUserIds
      `,
      { userId }
    );
    const chatUserIds: string[] = chatResult.records[0].get('chatUserIds');

    console.log('chatUserIds:', chatUserIds);

    // Filter connections by degree if specified
    let eligibleConnections = connections;
    if (typeof degreeFilter === 'number' && degreeFilter > 0) {
      eligibleConnections = connections.filter(c => c.degree === degreeFilter);
    }
    const eligibleUserIds = eligibleConnections.map(c => c.connectionId);

    let posts: any[] = [];
    let rpcError = null;

    // Try RPC first - now passing the degreeFilter parameter
    try {
      const { data: rpcPosts, error } = await supabaseAdmin.rpc('get_filtered_posts', {
        requesting_user_id: userId,
        eligible_user_ids: eligibleUserIds,
        chat_user_ids: chatUserIds,
        user_degree_map: Object.fromEntries(userDegreeMap),
        page_offset: offset,
        page_limit: limit + 1, // Fetch one extra to check if more exist
        degree_filter: (typeof degreeFilter === 'number' && degreeFilter > 0) ? degreeFilter : null
      });

      if (error) {
        rpcError = error;
        throw error;
      }

      posts = rpcPosts || [];
    } catch (error) {
      console.warn('RPC function failed, using fallback approach:', error);
      posts = await getFallbackPostsWithExtra(userId, eligibleUserIds, chatUserIds, userDegreeMap, offset, limit);
    }

    // Check if we have more posts (we fetched limit + 1)
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Format response
    const formattedPosts = postsToReturn.map((post: any) => ({
      ...post,
      connectionType: post.connection_degree === 0 ? "0" : String(post.connection_degree),
      user_interested: post.user_interested ?? false,
      user_accepted: post.user_accepted ?? false,
    }));

    // getting mutual connections count for each post owner
    const uniquePostOwnerIds = [...new Set(formattedPosts.map(p => p.user_id))];
    const mutualsCountByUser = new Map<string, number>();

    for (const postOwnerId of uniquePostOwnerIds) {
      if (postOwnerId === userId) continue;
      const mutualCount = await getMutualConnectionsCount(userId, postOwnerId);
      mutualsCountByUser.set(postOwnerId, mutualCount);
    }

    const enrichedPosts = formattedPosts.map(post => ({
      ...post,
      mutual_count: mutualsCountByUser.get(post.user_id) ?? 0,
    }));


    return {
      posts: enrichedPosts,
      pagination: {
        currentPage: page,
        limit,
        hasMore,
        totalFetched: (page - 1) * limit + formattedPosts.length,
        isUpToDate: formattedPosts.length === 0 && page === 1,
        nextPage: hasMore ? page + 1 : undefined
      }
    };

  } finally {
    await session.close();
  }
}
