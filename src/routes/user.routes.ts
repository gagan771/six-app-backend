import { Router } from 'express';
import { connectUsers, createUserNode, fetchConnectionDetails, fetchConnections, fetchConnectionsRequests, fetchMutualConnections, fetchPosts, removeConnectionAndChat, removeConnection, cacheConnections, getCachedConnections } from '../controllers/userController';

const router = Router();

router.post('/create-node', createUserNode);
router.post('/connect', connectUsers);
router.post('/remove-connection', removeConnection);
router.post('/remove-connection-and-chat', removeConnectionAndChat);
router.post('/connection-details', fetchConnectionDetails);
router.get('/connections/:id', fetchConnections);
router.get('/mutuals/:userId1/:userId2', fetchMutualConnections); 
router.get('/posts/:userId', fetchPosts); 
router.get('/connection-requests/:userId/:userName', fetchConnectionsRequests); 
router.post('/cache-connections/:userId', cacheConnections);
router.get('/cached-connections/:userId', getCachedConnections);

export default router;
