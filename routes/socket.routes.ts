import express from "express";
import {
	getActiveUsersInRoom,
	getTypingUsersInRoom,
	getSocketStats,
	sendMessageToUser,
} from "../controllers/socket.controllers";
import { verifyHybridJWT } from "../middlewares/hybrid-auth.middlewares";

const router = express.Router();

// All socket routes require authentication
router.use(verifyHybridJWT);

/**
 * @swagger
 * /api/socket/rooms/{id}/active-users:
 *   get:
 *     summary: Get active users in a room
 *     tags: [Socket]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Active users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activeUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                       isOnline:
 *                         type: boolean
 *                 count:
 *                   type: number
 *       403:
 *         description: Access denied
 *       404:
 *         description: Room not found
 */
router.get("/rooms/:id/active-users", getActiveUsersInRoom);

/**
 * @swagger
 * /api/socket/rooms/{id}/typing-users:
 *   get:
 *     summary: Get typing users in a room
 *     tags: [Socket]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Typing users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 typingUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       username:
 *                         type: string
 *                 count:
 *                   type: number
 *       403:
 *         description: Access denied
 *       404:
 *         description: Room not found
 */
router.get("/rooms/:id/typing-users", getTypingUsersInRoom);

/**
 * @swagger
 * /api/socket/stats:
 *   get:
 *     summary: Get socket server statistics (admin only)
 *     tags: [Socket]
 *     responses:
 *       200:
 *         description: Socket statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     connectedUsers:
 *                       type: number
 *                     activeRooms:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Admin access required
 */
router.get("/stats", getSocketStats);

/**
 * @swagger
 * /api/socket/send-message:
 *   post:
 *     summary: Send message to specific user (admin only)
 *     tags: [Socket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Target user ID
 *               message:
 *                 type: string
 *                 description: Message content
 *               eventType:
 *                 type: string
 *                 default: notification
 *                 description: Event type
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sent:
 *                   type: boolean
 *       403:
 *         description: Admin access required
 */
router.post("/send-message", sendMessageToUser);

export { router as socketRoutes };
