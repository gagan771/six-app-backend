import { Router } from 'express';
import { connectUsers, createUserNode, fetchConnectionDetails, fetchConnections, fetchConnectionsRequests, fetchMutualConnections, fetchPosts, removeConnetion } from '../controllers/userController';

const router = Router();

router.post('/create-node', createUserNode);
router.post('/connect', connectUsers);
router.post('/remove-connetion', removeConnetion);
router.post('/connection-details', fetchConnectionDetails);
router.get('/connections/:id', fetchConnections);
router.get('/mutuals/:userId1/:userId2', fetchMutualConnections); 
router.get('/posts/:userId', fetchPosts); 
router.get('/connection-requests/:userId/:userName', fetchConnectionsRequests); 

export default router;
