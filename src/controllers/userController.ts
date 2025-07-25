import { Request, Response } from 'express';
import { addConnection, cacheUserConnectionsOptimized, createUserNodeOnSignup, getConnectedPosts, getConnectedPostsNew, getConnectionDegree, getConnections, getMutualConnections, getMutualConnectionsCount,  getUserConnectionsOptimized,  removeUserConnection } from '../services/userService';
import { getUserConnectionRequests } from '../services/post.services';
import { removeUserConnectionAndChat, removeUserConnectionFromNeo4j } from '../services/connection.service';

export const createUserNode = async (req: Request, res: Response) => {
    const { userId, name, phone } = req.body;
    const result = await createUserNodeOnSignup(userId, name, phone);
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
};

export const connectUsers = async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.body;
    const result = await addConnection(userId1, userId2);
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
};

export const removeConnectionAndChat = async (req: Request, res: Response) => {
    const { userId1, userId2, chatId } = req.body;
    const result = await removeUserConnectionAndChat(userId1, userId2, chatId);
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
};

export const removeConnection = async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.body;
    const result = await removeUserConnectionFromNeo4j(userId1, userId2);
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to remove connection' });
    }
};

export const fetchConnectionDetails = async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.body;
    const mutualCount = await getMutualConnectionsCount(userId1, userId2);
    const degree = await getConnectionDegree(userId1, userId2);
    res.json({ success: true, data: {
        mutualCount: mutualCount.data,
        connectionDegree: degree.data,
    } });

};

export const fetchConnections = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const result = await getConnections(userId);
    if (result.success) {
        res.json({ success: true, message: result.message, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
};

export const fetchMutualConnections = async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.params;
    const result = await getMutualConnections(userId1, userId2);
    if (result.success) {
        res.json({ success: true, message: result.message, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
}

export const fetchPosts = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { degreeFilter, page, limit } = req.query;
    
    // Handle NaN values from Number() conversion
    const parsedDegreeFilter = Number(degreeFilter);
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    
    const result = await getConnectedPostsNew(
        userId,
        isNaN(parsedDegreeFilter) ? 0 : parsedDegreeFilter,
        isNaN(parsedPage) ? 1 : parsedPage,
        isNaN(parsedLimit) ? 20 : parsedLimit
    );
    if (result.success) {
        res.json({ success: true, message: result.message, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
}

export const fetchConnectionsRequests = async (req: Request, res: Response) => {
    const { userId, userName } = req.params;
    const data = await getUserConnectionRequests(userId, userName);
    res.json({ success: true, message: data.message, data: data.data });
}

export const cacheConnections = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await cacheUserConnectionsOptimized(userId);
    if (result.success) {
        res.json({ success: true, message: result.message, data: result.data, executionTime: result.executionTime });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
}

export const getCachedConnections = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await getUserConnectionsOptimized(userId);
    if (result.success) {
        res.json({ success: true,data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
}