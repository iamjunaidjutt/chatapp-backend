import { Response } from "express";
import mongoose from "mongoose";
import { Room, UserRoom, User } from "../models";
import { HybridAuthRequest } from "../middlewares/hybrid-auth.middlewares";
import { getSocketService } from "../utils/socket.instance";

/**
 * Get active users in a room (for online presence)
 */
export const getActiveUsersInRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const currentUserId = req.user?.id;

		// Validate room ID
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Check if user has access to the room
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

		try {
			const socketService = getSocketService();
			const activeUserIds = socketService.getActiveUsersInRoom(id);

			// Get user details for active users
			const activeUsers = await User.find({
				_id: { $in: activeUserIds },
			}).select("username email avatarUrl isOnline");

			res.status(200).json({
				message: "Active users retrieved successfully",
				activeUsers,
				count: activeUsers.length,
			});
		} catch (socketError) {
			// If socket service is not available, return empty array
			res.status(200).json({
				message:
					"Active users retrieved successfully (socket service unavailable)",
				activeUsers: [],
				count: 0,
			});
		}
	} catch (error) {
		console.error("Error getting active users:", error);
		res.status(500).json({
			message: "Failed to get active users",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Get typing users in a room
 */
export const getTypingUsersInRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const currentUserId = req.user?.id;

		// Validate room ID
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Check if user has access to the room
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

		try {
			const socketService = getSocketService();
			const typingUsers = socketService.getTypingUsersInRoom(id);

			res.status(200).json({
				message: "Typing users retrieved successfully",
				typingUsers,
				count: typingUsers.length,
			});
		} catch (socketError) {
			// If socket service is not available, return empty array
			res.status(200).json({
				message:
					"Typing users retrieved successfully (socket service unavailable)",
				typingUsers: [],
				count: 0,
			});
		}
	} catch (error) {
		console.error("Error getting typing users:", error);
		res.status(500).json({
			message: "Failed to get typing users",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Get socket server statistics
 */
export const getSocketStats = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		// Check if user is admin (optional security check)
		const user = await User.findById(req.user?.id);
		if (!user || user.role !== "admin") {
			res.status(403).json({ message: "Admin access required" });
			return;
		}

		try {
			const socketService = getSocketService();
			const connectedUsers = socketService.getConnectedUsersCount();
			const activeRooms = socketService.getActiveRoomsCount();

			res.status(200).json({
				message: "Socket statistics retrieved successfully",
				stats: {
					connectedUsers,
					activeRooms,
					timestamp: new Date(),
				},
			});
		} catch (socketError) {
			res.status(200).json({
				message:
					"Socket statistics retrieved successfully (socket service unavailable)",
				stats: {
					connectedUsers: 0,
					activeRooms: 0,
					timestamp: new Date(),
				},
			});
		}
	} catch (error) {
		console.error("Error getting socket stats:", error);
		res.status(500).json({
			message: "Failed to get socket statistics",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Send message to specific user (admin only)
 */
export const sendMessageToUser = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { userId, message, eventType = "notification" } = req.body;

		// Check if user is admin
		const currentUser = await User.findById(req.user?.id);
		if (!currentUser || currentUser.role !== "admin") {
			res.status(403).json({ message: "Admin access required" });
			return;
		}

		// Validate input
		if (!userId || !message) {
			res.status(400).json({
				message: "UserId and message are required",
			});
			return;
		}

		try {
			const socketService = getSocketService();
			const success = socketService.sendToUser(userId, "error", {
				message,
				code: eventType,
				timestamp: new Date(),
			});

			res.status(200).json({
				message: success
					? "Message sent successfully"
					: "User not connected",
				sent: success,
			});
		} catch (socketError) {
			res.status(500).json({
				message: "Socket service unavailable",
				error:
					process.env.NODE_ENV === "development"
						? socketError
						: undefined,
			});
		}
	} catch (error) {
		console.error("Error sending message to user:", error);
		res.status(500).json({
			message: "Failed to send message",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};
