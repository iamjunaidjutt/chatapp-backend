import express from "express";

import {
	getUserRooms,
	updateUserRole,
	updateLastSeen,
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
 *       - sessionAuth: []
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
 *       - sessionAuth: []
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
 *       - sessionAuth: []
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

export { router };
