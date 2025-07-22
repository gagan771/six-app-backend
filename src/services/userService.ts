import driver from '../config/neo4j';
import { supabaseAdmin } from '../config/supabase';
import { PaginatedPostsResponse } from '../types/post.types';
import { getFallbackPostsWithExtra } from '../utils/postFallback';
import { logger } from './log.services';

export type UserServiceResponse = { success: boolean; message?: string; data?: any; error?: string }

export async function createUserNodeOnSignup(userId: string, name: string, phone: string) {
  const session = driver.session();
  try {
    const query = `
      MERGE (u:User {id: $userId})
      SET u.name = $name, u.phone = $phone
    `;
    const params = { userId, name, phone };
    await session.run(query, params);
    return { success: true, message: `Created user node ${userId}` };
  } catch (error: any) {
    await logger.error('createUserNodeOnSignup', 'Error creating user node:', error);
    return { success: false, error: error.message || 'Failed to create user node' };
  } finally {
    await session.close();
  }
}

export async function checkIfUserAreConnected(userId1: string, userId2: string): Promise<UserServiceResponse> {
  const session = driver.session();
  try {
    const result = await session.run(
      `
        MATCH (u1:User {id: $userId1})-[:CONNECTED_TO]->(u2:User {id: $userId2})
        RETURN u1, u2
      `, { userId1, userId2 });
    return { success: true, message: 'User are connected', data: result.records[0] };
  } catch (error: any) {
    await logger.error('checkIfUserAreConnected', 'Error checking if users are connected:', error);
    return { success: false, error: error.message || 'Failed to check if users are connected' };
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
    return { success: true, message: `Connected ${userId1} ↔ ${userId2}` };
  } catch (error: any) {
    await logger.error('addConnection', `Error connecting user ${userId1} and ${userId2}`, error);
    return { success: false, error: error.message || 'Failed to connect users' };
  } finally {
    await session.close();
  }
}

export async function createBidirectionalConnection(
  userId1: string,
  userId2: string,
): Promise<UserServiceResponse> {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u1:User {id: $userId1})
      MATCH (u2:User {id: $userId2})
      MERGE (u1)-[:CONNECTED_TO]->(u2)
      MERGE (u2)-[:CONNECTED_TO]->(u1)
      `,
      { userId1, userId2 }
    );
    return { success: true, message: `Created bidirectional connection between ${userId1} ↔ ${userId2}` };
  } catch (error: any) {
    await logger.error('createBidirectionalConnection', `Error creating bidirectional connection between users ${userId1} and ${userId2}`, error);
    return { success: false, error: error.message || 'Failed to create bidirectional connection' };
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

    const data = result.records.map(record => ({
      connectionId: record.get('connectionId'),
      degree: record.get('degree').toInt()
    }));
    return { success: true, message: 'Connections fetched successfully', data };
  } catch (error: any) {
    await logger.error('getConnections', `Error getting connections for user ${userId}`, error);
    return { success: false, error: error.message || 'Failed to get connections' };
  } finally {
    await session.close();
  }
}

export async function getConnectionDegree(senderId: string, ownerId: string): Promise<{ success: boolean; message?: string; data?: number; error?: string }> {
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
    if (!record) return { success: false, error: 'Connection degree not found' };

    return { success: true, message: 'Connection degree fetched successfully', data: record.get('degree').toInt() };
  } catch (error: any) {
    await logger.error('getConnectionDegree', `Error getting connection degree for user ${senderId} and ${ownerId}`, error);
    return { success: false, error: error.message || 'Failed to get connection degree' };
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

    const data = result.records.map(record => ({
      mutualId: record.get('mutualId'),
      degree: record.get('degree').toInt()
    }));
    return { success: true, message: 'Mutual connections fetched successfully', data };
  } catch (error: any) {
    await logger.error('getMutualConnections', `Error fetching mutuals for user ${userId1} and ${userId2}`, error);
    return { success: false, error: error.message || 'Failed to get mutual connections' };
  } finally {
    await session.close();
  }
}

export async function getMutualConnectionsCount(userId1: string, userId2: string): Promise<UserServiceResponse> {
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
    return { success: true, message: 'Mutual connections count fetched successfully', data: result.records[0].get('mutualCount').toInt() };
  } catch (error: any) {
    await logger.error('getMutualConnectionsCount', `Error fetching mutual connections count for user ${userId1} and ${userId2}`, error);
    return { success: false, error: error.message || 'Failed to get mutual connections count' };
  } finally {
    await session.close();
  }
}

export async function removeUserConnection(userId1: string, userId2: string) {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u1:User {id: $userId1})-[r1:CONNECTED_TO]->(u2:User {id: $userId2})
      MATCH (u2:User {id: $userId2})-[r2:CONNECTED_TO]->(u1:User {id: $userId1})
      DELETE r1, r2
      `,
      { userId1, userId2 }
    );
    return { success: true, message: 'Bidirectional connection removed successfully' };
  } catch (error: any) {
    await logger.error('removeUserConnection', `Error removing bidirectional connection for user ${userId1} and ${userId2}`, error);
    return { success: false, error: error.message || 'Failed to remove connection' };
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
  const startTime = Date.now();
  const session = driver.session();
  const offset = (page - 1) * limit;
  try {
    // Get user connections with degrees (including self as degree 0)
    const neo4jStartTime = Date.now();
    const neo4jResult = await session.run(
      `
      MATCH (u:User {id: $userId})
      MATCH path = (u)-[:CONNECTED_TO*1..3]->(other:User)
      WHERE u.id <> other.id
      WITH other.id AS connectionId, other.name AS name, length(path) AS degree
      ORDER BY degree
      WITH connectionId, name, min(degree) AS degree
      RETURN connectionId, name, degree
      UNION
      MATCH (self:User {id: $userId})
      RETURN $userId AS connectionId, self.name AS name, 0 AS degree
      `,
      { userId }
    );
    const neo4jTime = Date.now() - neo4jStartTime;
    console.log(`[getConnectedPosts] Neo4j connections query: ${neo4jTime}ms`);


    const connections = neo4jResult.records.map(record => ({
      connectionId: record.get('connectionId'),
      name: record.get('name'),
      degree: record.get('degree').toInt(),
    }));

    const userDegreeMap = new Map(connections.map(c => [c.connectionId, c.degree]));

    // Get bidirectional chat connections for hide_from_chat logic
    const chatStartTime = Date.now();
    const chatResult = await session.run(
      `
      MATCH (u:User {id: $userId})-[:CONNECTED_TO]->(other:User)-[:CONNECTED_TO]->(u)
      RETURN collect(other.id) AS chatUserIds
      `,
      { userId }
    );
    const chatTime = Date.now() - chatStartTime;
    console.log(`[getConnectedPosts] Chat connections query: ${chatTime}ms`);
    const chatUserIds: string[] = chatResult.records[0].get('chatUserIds');

    // Filter connections by degree if specified
    let eligibleConnections = connections;
    if (typeof degreeFilter === 'number' && degreeFilter > 0) {
      eligibleConnections = connections.filter(c => c.degree === degreeFilter);
    }
    const eligibleUserIds = eligibleConnections.map(c => c.connectionId);

    let posts: any[] = [];
    let rpcError = null;

    // Try RPC first - now passing the degreeFilter parameter
    const rpcStartTime = Date.now();
    try {
      const { data: rpcPosts, error } = await supabaseAdmin.rpc('get_posts_new', {
        requesting_user_id: userId,
        eligible_user_ids: eligibleUserIds,
        chat_user_ids: chatUserIds,
        user_degree_map: Object.fromEntries(userDegreeMap),
        page_offset: offset,
        page_limit: limit + 1, // Fetch one extra to check if more exist
        degree_filter: (typeof degreeFilter === 'number' && degreeFilter > 0) ? degreeFilter : null
      });

      if (error) {
        console.log('error', error);
        rpcError = error;
        throw error;
      }
      const rpcTime = Date.now() - rpcStartTime;
      console.log(`[getConnectedPosts] RPC posts query: ${rpcTime}ms`);
      console.log('rpcPosts', rpcPosts);
      posts = rpcPosts || [];

    } catch (error) {
      const rpcTime = Date.now() - rpcStartTime;
      console.log(`[getConnectedPosts] RPC failed after ${rpcTime}ms, using fallback`);
      console.log('error', error);
      // await logger.warn('getConnectedPosts', 'RPC function failed, using fallback approach:', error);
      const fallbackStartTime = Date.now();
      posts = await getFallbackPostsWithExtra(userId, eligibleUserIds, chatUserIds, userDegreeMap, offset, limit);
      const fallbackTime = Date.now() - fallbackStartTime;
      console.log(`[getConnectedPosts] Fallback posts query: ${fallbackTime}ms`);
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
    const mutualStartTime = Date.now();
    const uniquePostOwnerIds = [...new Set(formattedPosts.map(p => p.user_id))];
    const mutualsCountByUser = new Map<string, number>();

    for (const postOwnerId of uniquePostOwnerIds) {
      if (postOwnerId === userId) continue;
      const mutualCount = await getMutualConnectionsCount(userId, postOwnerId);
      mutualsCountByUser.set(postOwnerId, mutualCount.data ?? 0);
    }
    const mutualTime = Date.now() - mutualStartTime;
    console.log(`[getConnectedPosts] Mutual connections count: ${mutualTime}ms for ${uniquePostOwnerIds.length} users`);

    const enrichedPosts = formattedPosts.map(post => ({
      ...post,
      mutual_count: mutualsCountByUser.get(post.user_id) ?? 0,
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[getConnectedPosts] Total execution time: ${totalTime}ms`);

    return {
      success: true,
      message: 'Connected posts fetched successfully',
      data: {
        posts: enrichedPosts,
        pagination: {
          currentPage: page,
          limit,
          hasMore,
          totalFetched: (page - 1) * limit + formattedPosts.length,
          isUpToDate: formattedPosts.length === 0 && page === 1,
          nextPage: hasMore ? page + 1 : undefined
        }
      }
    }
  } catch (error: any) {
    await logger.error('getConnectedPosts', 'Error fetching connected posts:', error);
    return {
      success: false,
      message: 'Failed to fetch connected posts',
      error: error.message || 'Failed to fetch connected posts',
      data: null
    };
  } finally {
    await session.close();
  }
}

export async function getConnectedPostsNew(
  userId: string,
  degreeFilter: number,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedPostsResponse> {
  const startTime = Date.now();
  const offset = (page - 1) * limit;

  try {
    // Try RPC call
    const rpcStartTime = Date.now();
    let posts: any[] = [];

    try {
      const { data: rpcPosts, error } = await supabaseAdmin.rpc('get_posts_latest', {
        requesting_user_id: userId,
        page_offset: offset,
        page_limit: limit + 1, // Fetch one extra to check if more exist
        degree_filter: (typeof degreeFilter === 'number' && degreeFilter > 0) ? degreeFilter : null
      });

      if (error) {
        console.log('RPC error:', error);
        throw error;
      }

      const rpcTime = Date.now() - rpcStartTime;
      console.log(`[getConnectedPosts] RPC posts query: ${rpcTime}ms`);
      posts = rpcPosts || [];

    } catch (error) {
      const rpcTime = Date.now() - rpcStartTime;
      console.log(`[getConnectedPosts] RPC failed after ${rpcTime}ms`);
      console.log('RPC error:', error);

      // TODO: Implement fallback query if needed
      // const fallbackStartTime = Date.now();
      // posts = await getFallbackPostsWithExtra(userId, eligibleUserIds, chatUserIds, userDegreeMap, offset, limit);
      // const fallbackTime = Date.now() - fallbackStartTime;
      // console.log(`[getConnectedPosts] Fallback posts query: ${fallbackTime}ms`);

      throw error; // For now, throw the error since fallback is commented out
    }

    // Check if we have more posts (we fetched limit + 1)
    const hasMore = posts && posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Format response
    const formattedPosts = postsToReturn.map((post: any) => ({
      ...post,
      user_interested: post.user_interested ?? false,
      user_accepted: post.user_accepted ?? false,
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[getConnectedPosts] Total execution time: ${totalTime}ms`);

    return {
      success: true,
      message: 'Connected posts fetched successfully',
      data: {
        posts: formattedPosts,
        pagination: {
          currentPage: page,
          limit,
          hasMore,
          totalFetched: (page - 1) * limit + formattedPosts.length,
          isUpToDate: formattedPosts.length === 0 && page === 1,
          nextPage: hasMore ? page + 1 : undefined
        }
      }
    }
  } catch (error: any) {
    await logger.error('getConnectedPosts', 'Error fetching connected posts:', error);
    return {
      success: false,
      message: 'Failed to fetch connected posts',
      error: error.message || 'Failed to fetch connected posts',
      data: null
    };
  }
}

// 1. FASTEST: Batch delete using proper syntax (recommended)
export async function cacheUserConnectionsOptimized(userId: string) {
  const session = driver.session();

  try {
    console.log(`Starting optimized cache generation for user: ${userId}`);
    const startTime = Date.now();

    // Single atomic transaction
    const result = await session.executeWrite(async tx => {
      // Step 1: Delete old cache (fast)
      await tx.run(`
        MATCH (u:User {id: $userId})-[r:HAS_DEGREE]->()
        DELETE r
      `, { userId });

      // Step 2: Build cache with single optimized query
      const cacheResult = await tx.run(`
        MATCH (u:User {id: $userId})
        
        // Get all connections with degrees in one go
        CALL {
          WITH u
          MATCH path = (u)-[:CONNECTED_TO*1..3]-(conn:User)
          WHERE u.id <> conn.id
          WITH conn, length(path) as pathLength
          ORDER BY pathLength
          WITH conn, min(pathLength) as degree
          RETURN conn, degree
        }
        
        // Get mutual connections efficiently
        WITH u, collect({conn: conn, degree: degree}) as connections
        UNWIND connections as c
        WITH u, c.conn as conn, c.degree as degree
        
        OPTIONAL MATCH (u)-[:CONNECTED_TO]-(mutual:User)-[:CONNECTED_TO]-(conn)
        WHERE mutual.id <> u.id AND mutual.id <> conn.id
        WITH u, conn, degree, count(DISTINCT mutual) as mutuals
        
        // Check if bidirectional (isChat)
        OPTIONAL MATCH (u)-[r1:CONNECTED_TO]-(conn)
        WITH u, conn, degree, mutuals, 
             (count(r1) >= 2) as isChat
        
        // Create cache relationship
        CREATE (u)-[cache:HAS_DEGREE]->(conn)
        SET cache.degree = degree,
            cache.mutuals = mutuals,
            cache.isChat = isChat,
            cache.updatedAt = timestamp()
        
        RETURN count(*) as cached_count
      `, { userId });

      return cacheResult.records[0]?.get('cached_count') || 0;
    });

    const totalTime = Date.now() - startTime;
    console.log(`Cache generated for ${result} connections in ${totalTime}ms`);

    // Step 3: Fetch the complete cached data
    const cachedDataResult = await getUserConnectionsOptimized(userId, {
      degree: 0,
      limit: 1000, // Get a large batch to ensure we have all connections
      offset: 0,
      sortBy: 'degree',
      order: 'ASC'
    });

    if (!cachedDataResult.success) {
      throw new Error(cachedDataResult.error || 'Failed to get cached data');
    }

    const cachedConnections = cachedDataResult.data?.connections || [];

    // Step 4: Store cached data in Supabase user_connections table
    if (cachedConnections.length > 0) {
      try {
        // Prepare data for Supabase insertion
        const supabaseData = cachedConnections.map((conn: any) => ({
          user_id: userId,
          connection_id: conn.id,
          degree: conn.degree,
          is_chat: conn.isChat,
          mutuals: conn.mutuals,
          updated_at: conn.updatedAt
        }));

        // Delete existing connections for this user
        const { error: deleteError } = await supabaseAdmin
          .from('user_connections')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting existing connections:', deleteError);
        }

        // Insert new connections
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from('user_connections')
          .insert(supabaseData)
          .select();

        if (insertError) {
          console.error('Error inserting connections to Supabase:', insertError);
        } else {
          console.log(`Successfully stored ${insertedData?.length || 0} connections in Supabase`);
        }
      } catch (supabaseError) {
        console.error('Supabase operation failed:', supabaseError);
      }
    }

    return {
      success: true,
      message: `Cache generated for ${result} connections`,
      executionTime: totalTime,
      data: cachedConnections
    };

  } catch (err) {
    console.error('Neo4j cache error:', err);
    return { success: false, error: 'Failed to generate cache' };
  } finally {
    await session.close();
  }
}

export async function getUserConnectionsOptimized(userId: string, options: {
  degree?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'degree' | 'mutuals' | 'updatedAt';
  order?: 'ASC' | 'DESC';
  onlyChats?: boolean;
} = {}) {
  const {
    degree,
    limit = 50,
    offset = 0,
    sortBy = 'degree',
    order = 'ASC',
    onlyChats = false
  } = options;

  let whereClause = '';
  let orderClause = `ORDER BY r.${sortBy} ${order}`;

  if (degree) {
    whereClause += ` AND r.degree = $degree`;
  }

  if (onlyChats) {
    whereClause += ` AND r.isChat = true`;
  }

  // Helper function to convert Neo4j integers
  const convertNeo4jInt = (neo4jInt: any) => {
    if (typeof neo4jInt === 'object' && neo4jInt !== null) {
      return neo4jInt.low + (neo4jInt.high * 0x100000000);
    }
    return neo4jInt;
  };

  // Single query that returns both data and count
  const COMBINED_QUERY = `
    MATCH (u:User {id: $userId})-[r:HAS_DEGREE]->(conn:User)
    WHERE 1=1 ${whereClause}
    
    WITH collect({
      connection: conn {
        .id,
        degree: r.degree,
        mutuals: r.mutuals,
        isChat: r.isChat
      },
      sortValue: r.${sortBy}
    }) AS allConnections
    
    WITH allConnections, size(allConnections) AS total
    
    RETURN {
      connections: [conn IN allConnections | conn.connection][$offset..$offset + $limit],
      total: total
    } AS result
  `;

  const session = driver.session();
  try {
    const params = { userId, degree, limit, offset };

    const result = await session.run(COMBINED_QUERY, params);
    const data = result.records[0]?.get('result') || { connections: [], total: 0 };

    // Clean up the data format
    const cleanConnections = data.connections.map((conn: any) => ({
      id: conn.id,
      isChat: conn.isChat,
      degree: convertNeo4jInt(conn.degree),
      mutuals: convertNeo4jInt(conn.mutuals)
    }));

    return {
      success: true,
      data: {
        connections: cleanConnections,
        pagination: {
          total: convertNeo4jInt(data.total),
          limit,
          offset,
          hasMore: offset + limit < convertNeo4jInt(data.total)
        }
      }
    };
  } catch (err) {
    console.error('Neo4j error:', err);
    return { success: false, error: 'Failed to fetch connections' };
  } finally {
    await session.close();
  }
}
