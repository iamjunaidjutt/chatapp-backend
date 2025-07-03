import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { Message, IMessage } from "../models";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management
 */

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     description: Send a new message to a room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - userId
 *               - roomId
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello, everyone!"
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               roomId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", (req: Request, res: Response): void => {
	const messageData = req.body;
	res.status(201).json({ message: "Message sent", data: messageData });
});

/**
 * @swagger
 * /messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     description: Retrieve a specific message by its ID
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
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", (req: Request, res: Response): void => {
	const { id } = req.params;
	res.json({ message: `Get message with ID: ${id}` });
});

/**
 * @swagger
 * /messages/{id}:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
 *     description: Edit an existing message (only by the sender)
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
 *                 example: "Hello, everyone! (edited)"
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         description: Forbidden - can only edit your own messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", (req: Request, res: Response): void => {
	const { id } = req.params;
	const { content } = req.body;
	res.json({ message: `Update message with ID: ${id}`, content });
});

/**
 * @swagger
 * /messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     description: Delete a message (only by the sender or admin)
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         description: Forbidden - can only delete your own messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", (req: Request, res: Response): void => {
	const { id } = req.params;
	res.json({ message: `Delete message with ID: ${id}` });
});

export { router };
