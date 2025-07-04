import express from "express";
import {
	getMessageById,
	updateMessage,
	deleteMessage,
	searchMessages,
} from "../controllers/message.controllers";
import { requireAuth } from "../middlewares/auth.middlewares";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management
 */

/**
 * @swagger
 * /messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     description: Retrieve a specific message by its ID (requires authentication and room access)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid message ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No access to this message
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", requireAuth, getMessageById);

/**
 * @swagger
 * /messages/{id}:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
 *     description: Edit an existing message (requires authentication and ownership)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439013"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated message content
 *                 example: "Hello, everyone! (edited)"
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - can only edit your own messages or message too old
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", requireAuth, updateMessage);

/**
 * @swagger
 * /messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     description: Delete a message (requires authentication and ownership)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message deleted successfully"
 *       400:
 *         description: Invalid message ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - can only delete your own messages
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", requireAuth, deleteMessage);

/**
 * @swagger
 * /messages/search/{roomId}:
 *   get:
 *     summary: Search messages in a room
 *     tags: [Messages]
 *     description: Search for messages in a specific room (requires authentication and room access)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         description: Room ID to search messages in
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: q
 *         required: true
 *         description: Search query
 *         schema:
 *           type: string
 *           example: "hello"
 *       - in: query
 *         name: limit
 *         description: Number of messages to return (max 50)
 *         schema:
 *           type: integer
 *           example: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Messages search completed"
 *                 query:
 *                   type: string
 *                   example: "hello"
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 total:
 *                   type: number
 *                   example: 5
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No access to this room
 *       404:
 *         description: Room not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/search/:id", requireAuth, searchMessages);

export { router };
