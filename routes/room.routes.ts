import express from "express";
import {
	getAllRooms,
	getRoomById,
	createRoom,
	updateRoom,
	deleteRoom,
} from "../controllers/room.controllers";
import {
	getRoomMessages,
	sendMessage,
} from "../controllers/message.controllers";
import {
	joinRoom,
	leaveRoom,
	getRoomParticipants,
	updateUserRole,
	updateLastSeen,
} from "../controllers/userRoom.controllers";
import {
	verifyHybridJWT,
	optionalHybridJWT,
} from "../middlewares/hybrid-auth.middlewares";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Chat room management
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     description: Retrieve a list of all chat rooms (authentication optional)
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: List of rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Rooms retrieved successfully"
 *                 rooms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 *                 total:
 *                   type: number
 *                   example: 5
 *       401:
 *         description: Not authenticated
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", verifyHybridJWT, getAllRooms);

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     description: Retrieve a specific room by its ID (requires authentication)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Room retrieved successfully"
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", verifyHybridJWT, getRoomById);

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     description: Create a new chat room (requires authentication)
 *     security:
 *       - hybridAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Room name
 *                 example: "general"
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 description: Room description
 *                 example: "A room for general discussions"
 *                 maxLength: 500
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the room is private
 *                 example: false
 *               maxParticipants:
 *                 type: number
 *                 description: Maximum number of participants (null means unlimited)
 *                 example: 100
 *                 minimum: 2
 *                 maximum: 1000
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Room created successfully"
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Room with this name already exists
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", verifyHybridJWT, createRoom);

/**
 * @swagger
 * /rooms/{id}/messages:
 *   get:
 *     summary: Get messages in a room
 *     tags: [Rooms]
 *     description: Retrieve all messages in a specific room (requires authentication and room access)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: limit
 *         description: Number of messages to retrieve (max 100)
 *         schema:
 *           type: integer
 *           example: 50
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         description: Number of messages to skip
 *         schema:
 *           type: integer
 *           example: 0
 *       - in: query
 *         name: before
 *         description: Get messages before this date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: after
 *         description: Get messages after this date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Messages retrieved successfully"
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     total:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No access to this room
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id/messages", verifyHybridJWT, getRoomMessages);

/**
 * @swagger
 * /rooms/{id}/messages:
 *   post:
 *     summary: Send a message to a room
 *     tags: [Rooms]
 *     description: Send a new message to a specific room (requires authentication and room access)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
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
 *                 description: Message content
 *                 example: "Hello everyone!"
 *                 maxLength: 1000
 *               messageType:
 *                 type: string
 *                 description: Type of message
 *                 enum: [text, image, file]
 *                 default: text
 *                 example: "text"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message sent successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No access to this room
 *       404:
 *         description: Room not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:id/messages", verifyHybridJWT, sendMessage);

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     summary: Update room
 *     tags: [Rooms]
 *     description: Update room information (requires authentication and ownership)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Room name
 *                 example: "Updated Room Name"
 *                 maxLength: 50
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the room is private
 *                 example: true
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No permission to update this room
 *       404:
 *         description: Room not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", verifyHybridJWT, updateRoom);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete room
 *     tags: [Rooms]
 *     description: Delete a room (requires authentication and ownership)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No permission to delete this room
 *       404:
 *         description: Room not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", verifyHybridJWT, deleteRoom);

/**
 * @swagger
 * /rooms/{id}/join:
 *   post:
 *     summary: Join room
 *     tags: [Rooms]
 *     description: Join a room as a participant (requires authentication)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Successfully joined the room
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Room not found
 *       409:
 *         description: Already a participant in this room
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:id/join", verifyHybridJWT, joinRoom);

/**
 * @swagger
 * /rooms/{id}/leave:
 *   post:
 *     summary: Leave room
 *     tags: [Rooms]
 *     description: Leave a room (requires authentication)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Successfully left the room
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Room not found
 *       409:
 *         description: Not a participant in this room
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:id/leave", verifyHybridJWT, leaveRoom);

/**
 * @swagger
 * /rooms/{id}/participants:
 *   get:
 *     summary: Get room participants
 *     tags: [Rooms]
 *     description: Get all participants in a room (requires authentication and room access)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Room ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Room participants retrieved successfully"
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRoom'
 *                 total:
 *                   type: number
 *                   example: 5
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No access to this room
 *       404:
 *         description: Room not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id/participants", verifyHybridJWT, getRoomParticipants);

export { router };
