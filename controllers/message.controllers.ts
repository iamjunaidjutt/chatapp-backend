import { Request, Response } from "express";
import mongoose from "mongoose";
import { Message, Room, UserRoom, IMessage } from "../models";
import { HybridAuthRequest } from "../middlewares/hybrid-auth.middlewares";

/**
 * Get messages in a room
 */
export const getRoomMessages = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const { limit = 50, offset = 0, before, after } = req.query;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Check if room exists and user has access
		const room = await Room.findById(id);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user is a participant in the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: id,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this room",
			});
			return;
		}

		// Build query
		const query: any = { roomId: id };

		// Add date filters if provided
		if (before) {
			query.sentAt = { ...query.sentAt, $lt: new Date(before as string) };
		}
		if (after) {
			query.sentAt = { ...query.sentAt, $gt: new Date(after as string) };
		}

		// Parse pagination parameters
		const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100 messages
		const offsetNum = parseInt(offset as string) || 0;

		const messages = await Message.find(query)
			.populate("userId", "username email avatarUrl")
			.sort({ sentAt: -1 })
			.limit(limitNum)
			.skip(offsetNum);

		const totalMessages = await Message.countDocuments(query);

		res.status(200).json({
			message: "Messages retrieved successfully",
			messages: messages.reverse(), // Reverse to show oldest first
			pagination: {
				limit: limitNum,
				offset: offsetNum,
				total: totalMessages,
				hasMore: offsetNum + limitNum < totalMessages,
			},
		});
	} catch (error) {
		console.error("Error getting room messages:", error);
		res.status(500).json({
			message: "Failed to retrieve messages",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Send a message to a room
 */
export const sendMessage = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const { content, messageType = "text" } = req.body;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Validation
		if (!content || content.trim().length === 0) {
			res.status(400).json({ message: "Message content is required" });
			return;
		}

		if (content.trim().length > 1000) {
			res.status(400).json({
				message: "Message content must be 1000 characters or less",
			});
			return;
		}

		// Check if room exists and user has access
		const room = await Room.findById(id);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user is a participant in the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: id,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this room",
			});
			return;
		}

		// Create message
		const message = new Message({
			content: content.trim(),
			userId: currentUserId,
			roomId: id,
			messageType,
		});

		await message.save();

		// Populate the created message
		const populatedMessage = await Message.findById(message._id).populate(
			"userId",
			"username email avatarUrl"
		);

		res.status(201).json({
			message: "Message sent successfully",
			data: populatedMessage,
		});

		// TODO: Emit socket event for real-time updates
		// io.to(id).emit("newMessage", populatedMessage);
	} catch (error) {
		console.error("Error sending message:", error);
		res.status(500).json({
			message: "Failed to send message",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Get a specific message by ID
 */
export const getMessageById = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid message ID" });
			return;
		}

		const message = await Message.findById(id)
			.populate("userId", "username email avatarUrl")
			.populate("roomId", "name isPrivate");

		if (!message) {
			res.status(404).json({ message: "Message not found" });
			return;
		}

		// Check if user has access to the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: message.roomId,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this message",
			});
			return;
		}

		res.status(200).json({
			message: "Message retrieved successfully",
			data: message,
		});
	} catch (error) {
		console.error("Error getting message by ID:", error);
		res.status(500).json({
			message: "Failed to retrieve message",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Update a message
 */
export const updateMessage = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const { content } = req.body;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid message ID" });
			return;
		}

		// Validation
		if (!content || content.trim().length === 0) {
			res.status(400).json({ message: "Message content is required" });
			return;
		}

		if (content.trim().length > 1000) {
			res.status(400).json({
				message: "Message content must be 1000 characters or less",
			});
			return;
		}

		const message = await Message.findById(id).populate("roomId");

		if (!message) {
			res.status(404).json({ message: "Message not found" });
			return;
		}

		// Check if user has access to the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: message.roomId,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this message",
			});
			return;
		}

		// Check if user owns the message
		if (message.userId.toString() !== currentUserId) {
			res.status(403).json({
				message: "You can only edit your own messages",
			});
			return;
		}

		// Check if message is not too old (optional: 15 minutes edit window)
		const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
		if (message.sentAt < fifteenMinutesAgo) {
			res.status(403).json({ message: "Message is too old to edit" });
			return;
		}

		// Update message
		message.content = content.trim();
		message.isEdited = true;
		message.editedAt = new Date();
		await message.save();

		const updatedMessage = await Message.findById(message._id).populate(
			"userId",
			"username email avatarUrl"
		);

		res.json({
			message: "Message updated successfully",
			data: updatedMessage,
		});

		// TODO: Emit socket event for real-time updates
		// io.to(message.roomId.toString()).emit("messageUpdated", updatedMessage);
	} catch (error) {
		console.error("Error updating message:", error);
		res.status(500).json({
			message: "Failed to update message",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Delete a message
 */
export const deleteMessage = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid message ID" });
			return;
		}

		const message = await Message.findById(id).populate("roomId");

		if (!message) {
			res.status(404).json({ message: "Message not found" });
			return;
		}

		// Check if user has access to the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: message.roomId,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this message",
			});
			return;
		}

		// Check if user owns the message or is admin
		if (
			message.userId.toString() !== currentUserId &&
			userRoom.role !== "admin"
		) {
			res.status(403).json({
				message: "You can only delete your own messages",
			});
			return;
		}

		await Message.findByIdAndDelete(id);

		res.json({
			message: "Message deleted successfully",
		});

		// TODO: Emit socket event for real-time updates
		// io.to(message.roomId.toString()).emit("messageDeleted", { messageId: id });
	} catch (error) {
		console.error("Error deleting message:", error);
		res.status(500).json({
			message: "Failed to delete message",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Search messages in a room
 */
export const searchMessages = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const { q, limit = 20 } = req.query;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		if (!q || (q as string).trim().length === 0) {
			res.status(400).json({ message: "Search query is required" });
			return;
		}

		// Check if room exists and user has access
		const room = await Room.findById(id);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user is a participant in the room
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: id,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You don't have access to this room",
			});
			return;
		}

		const limitNum = Math.min(parseInt(limit as string) || 20, 50);

		// Search messages using text search
		const messages = await Message.find({
			roomId: id,
			$text: { $search: q as string },
		})
			.populate("userId", "username email avatarUrl")
			.sort({ score: { $meta: "textScore" } })
			.limit(limitNum);

		res.json({
			message: "Messages search completed",
			query: q,
			messages,
			total: messages.length,
		});
	} catch (error) {
		console.error("Error searching messages:", error);
		res.status(500).json({
			message: "Failed to search messages",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};
