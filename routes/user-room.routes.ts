import express from "express";

import {
	getUserRooms,
	updateUserRole,
	updateLastSeen,
	approveJoinRequest,
	rejectJoinRequest,
	getPendingJoinRequests,
} from "../controllers/user-room.controllers";
import { verifyHybridJWT } from "../middlewares/hybrid-auth.middlewares";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UserRooms
 *   description: User-Room relationship management
 */

/**
 * @swagger
 * /user-rooms:
 *   get:
 *     summary: Get user's rooms
 *     tags: [UserRooms]
 *     description: Get all rooms that the authenticated user is a participant in
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: User rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User rooms retrieved successfully"
 *                 rooms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRoom'
 *                 total:
 *                   type: number
 *                   example: 3
 *       401:
 *         description: Not authenticated
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", verifyHybridJWT, getUserRooms);

/**
 * @swagger
 * /user-rooms/{roomId}/users/{userId}/role:
 *   put:
 *     summary: Update user role in room
 *     tags: [UserRooms]
 *     description: Update a user's role in a room (admin only)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID whose role to update
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, admin, moderator]
 *                 description: New role for the user
 *                 example: "moderator"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User role updated successfully"
 *                 userRoom:
 *                   $ref: '#/components/schemas/UserRoom'
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only room admins can update user roles
 *       404:
 *         description: User is not a participant in this room
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:roomId/users/:userId/role", verifyHybridJWT, updateUserRole);

/**
 * @swagger
 * /user-rooms/{roomId}/last-seen:
 *   put:
 *     summary: Update last seen timestamp
 *     tags: [UserRooms]
 *     description: Update the last seen timestamp for the authenticated user in a room
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Last seen updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Last seen updated successfully"
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: You are not a participant in this room
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:roomId/last-seen", verifyHybridJWT, updateLastSeen);

/**
 * @swagger
 * /user-rooms/{roomId}/requests:
 *   get:
 *     summary: Get pending join requests for a room
 *     tags: [UserRooms]
 *     description: Get all pending join requests for a room (admin/moderator only)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Pending requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pending join requests retrieved successfully"
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userId:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                       roomId:
 *                         type: string
 *                       isRequest:
 *                         type: boolean
 *                         example: true
 *                       isActive:
 *                         type: boolean
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: number
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only room admins and moderators can view join requests
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:roomId/requests", verifyHybridJWT, getPendingJoinRequests);

/**
 * @swagger
 * /user-rooms/{roomId}/approve/{userId}:
 *   post:
 *     summary: Approve a join request
 *     tags: [UserRooms]
 *     description: Approve a pending join request for a private room (admin/moderator only)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID whose request to approve
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Join request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Join request approved successfully"
 *                 userRoom:
 *                   type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only room admins and moderators can approve join requests
 *       404:
 *         description: Join request not found
 *       409:
 *         description: Room has reached maximum capacity
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:roomId/approve/:userId", verifyHybridJWT, approveJoinRequest);

/**
 * @swagger
 * /user-rooms/{roomId}/reject/{userId}:
 *   post:
 *     summary: Reject a join request
 *     tags: [UserRooms]
 *     description: Reject a pending join request for a private room (admin/moderator only)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID whose request to reject
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Join request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Join request rejected successfully"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only room admins and moderators can reject join requests
 *       404:
 *         description: Join request not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:roomId/reject/:userId", verifyHybridJWT, rejectJoinRequest);

export { router };
