import { Request, Response } from 'express';
import { addConnection, createUserNodeOnSignup, getConnectedPosts, getConnectionDegree, getConnections, getMutualConnections, getMutualConnectionsCount, removeUserConnection } from '../services/userService';
import { getUserConnectionRequests } from '../services/post.services';
import { removeUserConnectionAndChat } from '../services/connection.service';
import { logger } from '../services/log.services';

export const createUserNode = async (req: Request, res: Response) => {
    try {
        const { userId, name, phone } = req.body;
        const result = await createUserNodeOnSignup(userId, name, phone);
        res.json({ success: true, message: `Created Node ${userId}`, data: result });
    } catch (error: any) {
        await logger.error('createUserNode', 'Error creating user node:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create user node' });
    }
};

export const connectUsers = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2 } = req.body;
        const result = await addConnection(userId1, userId2);
        res.json({ success: true, message: `Connected ${userId1} ↔ ${userId2}`, data: result });
    } catch (error: any) {
        await logger.error('connectUsers', 'Error connecting users:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to connect users' });
    }
};

export const removeConnetion = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2, chatId } = req.body;
        const result = await removeUserConnectionAndChat(userId1, userId2, chatId);
        res.json({ success: true, message: `Removed ${userId1} ↔ ${userId2}`, data: result });
    } catch (error: any) {
        await logger.error('removeConnetion', 'Error removing connection:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to remove connection' });
    }
};

export const fetchConnectionDetails = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2 } = req.body;
        const mutualCount = await getMutualConnectionsCount(userId1, userId2);
        const degree = await getConnectionDegree(userId1, userId2);

        res.json({
            success: true,
            data: {
                mutualCount,
                connectionDegree: degree
            }
        });
    } catch (error: any) {
        await logger.error('fetchConnectionDetails', 'Error fetching connection details:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch connection details' });
    }
};

export const fetchConnections = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const data = await getConnections(userId);
        res.json({ success: true, data });
    } catch (error: any) {
        await logger.error('fetchConnections','Error fetching connections:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch connections' });
    }
};

export const fetchMutualConnections = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2 } = req.params;
        const data = await getMutualConnections(userId1, userId2);
        res.json({ success: true, data });
    } catch (error: any) {
        await logger.error('fetchMutualConnections', 'Error fetching mutual connections:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch mutual connections' });
    }
}

export const fetchPosts = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { degreeFilter, page, limit } = req.query;
        const data = await getConnectedPosts(
            userId,
            Number(degreeFilter),
            Number(page),
            Number(limit)
        );
        res.json({ success: true, data });
    } catch (error: any) {
        await logger.error('fetchPosts', 'Error fetching posts:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch posts' });
    }
}

export const fetchConnectionsRequests = async (req: Request, res: Response) => {
    try {
        const { userId, userName } = req.params;
        const data = await getUserConnectionRequests(userId, userName);
        res.json({ success: true, data });
    } catch (error: any) {
        await logger.error('fetchConnectionsRequests', 'Error fetching connection requests:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch connection requests' });
    }
}