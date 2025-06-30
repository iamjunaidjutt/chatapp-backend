import express from "express";

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
 *     description: Retrieve a list of all chat rooms
 *     responses:
 *       200:
 *         description: List of rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", (req, res) => {
	res.json({ message: "Get all rooms", rooms: [] });
});

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     description: Retrieve a specific room by its ID
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
 *               $ref: '#/components/schemas/Room'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", (req, res) => {
	const { id } = req.params;
	res.json({ message: `Get room with ID: ${id}` });
});

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     description: Create a new chat room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "general"
 *               isPrivate:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", (req, res) => {
	const roomData = req.body;
	res.status(201).json({ message: "Room created", room: roomData });
});

/**
 * @swagger
 * /rooms/{id}/messages:
 *   get:
 *     summary: Get messages in a room
 *     tags: [Rooms]
 *     description: Retrieve all messages in a specific room
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
 *         description: Number of messages to retrieve
 *         schema:
 *           type: integer
 *           example: 50
 *       - in: query
 *         name: offset
 *         description: Number of messages to skip
 *         schema:
 *           type: integer
 *           example: 0
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id/messages", (req, res) => {
	const { id } = req.params;
	const { limit = 50, offset = 0 } = req.query;
	res.json({
		message: `Get messages for room ${id}`,
		messages: [],
		pagination: { limit, offset },
	});
});

export { router };
