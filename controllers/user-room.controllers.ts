import { Response } from "express";
import mongoose from "mongoose";
import { UserRoom, Room, UserRoomRole } from "../models";
import { HybridAuthRequest } from "../middlewares/hybrid-auth.middlewares";

/**
 * Get all rooms for a user
 */
export const getUserRooms = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const currentUserId = req.user?.id;

		const userRooms = await UserRoom.find({
			userId: currentUserId,
			isActive: true,
		})
			.populate({
				path: "roomId",
				populate: {
					path: "createdBy",
					select: "username email avatarUrl",
				},
			})
			.sort({ lastSeenAt: -1, joinedAt: -1 });

		res.json({
			message: "User rooms retrieved successfully",
			rooms: userRooms,
			total: userRooms.length,
		});
	} catch (error) {
		console.error("Error getting user rooms:", error);
		res.status(500).json({
			message: "Failed to retrieve user rooms",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Get all participants in a room
 */
export const getRoomParticipants = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id: roomId } = req.params;
		const currentUserId = req.user?.id;

		// Validate that roomId exists and is a valid ObjectId
		if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Check if room exists
		const room = await Room.findById(roomId);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if current user is a participant
		const currentUserInRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
			isActive: true,
		});

		if (!currentUserInRoom) {
			res.status(403).json({
				message: "You don't have access to this room",
			});
			return;
		}

		const participants = await UserRoom.find({
			roomId: roomId,
			isActive: true,
		})
			.populate("userId", "username email avatarUrl")
			.sort({ role: 1, joinedAt: 1 });

		res.json({
			message: "Room participants retrieved successfully",
			participants,
			total: participants.length,
		});
	} catch (error) {
		console.error("Error getting room participants:", error);
		res.status(500).json({
			message: "Failed to retrieve room participants",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Join a room
 */
export const joinRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id: roomId } = req.params;
		const currentUserId = req.user?.id;

		// Validate that roomId exists and is a valid ObjectId
		if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Check if room exists
		const room = await Room.findById(roomId);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user is already in the room
		const existingUserRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
		});

		if (existingUserRoom) {
			if (existingUserRoom.isActive) {
				res.status(409).json({
					message: "You are already a participant in this room",
				});
				return;
			} else {
				// Reactivate if previously left
				existingUserRoom.isActive = true;
				existingUserRoom.joinedAt = new Date();
				await existingUserRoom.save();
			}
		} else {
			// Check room capacity
			if (room.maxParticipants) {
				const currentParticipants = await UserRoom.countDocuments({
					roomId: roomId,
					isActive: true,
				});

				if (currentParticipants >= room.maxParticipants) {
					res.status(409).json({
						message: "Room has reached maximum capacity",
					});
					return;
				}
			}

			// Create new UserRoom relationship
			const userRoom = new UserRoom({
				userId: currentUserId,
				roomId: roomId,
				role: "member",
			});

			await userRoom.save();
		}

		// Get updated room with participants
		const updatedUserRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
		})
			.populate("roomId")
			.populate("userId", "username email avatarUrl");

		res.json({
			message: "Successfully joined the room",
			userRoom: updatedUserRoom,
		});
	} catch (error) {
		console.error("Error joining room:", error);
		res.status(500).json({
			message: "Failed to join room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Leave a room
 */
export const leaveRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id: roomId } = req.params;
		const currentUserId = req.user?.id;

		// Validate that roomId exists and is a valid ObjectId
		if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		// Find the user room relationship
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
			isActive: true,
		});

		if (!userRoom) {
			res.status(409).json({
				message: "You are not a participant in this room",
			});
			return;
		}

		// Check if user is the creator and there are other participants
		const room = await Room.findById(roomId);
		if (room && room.createdBy?.toString() === currentUserId) {
			const otherParticipants = await UserRoom.find({
				roomId: roomId,
				userId: { $ne: currentUserId },
				isActive: true,
			});

			if (otherParticipants.length > 0) {
				// Transfer ownership to another admin or the first participant
				const newOwner =
					otherParticipants.find(
						(p) => p.role === UserRoomRole.ADMIN
					) || otherParticipants[0];
				if (newOwner) {
					room.createdBy = newOwner.userId;
					newOwner.role = UserRoomRole.ADMIN;
					await room.save();
					await newOwner.save();
				}
			}
		}

		// Mark as inactive instead of deleting (for audit purposes)
		userRoom.isActive = false;
		userRoom.notifications = false;
		await userRoom.save();

		res.json({
			message: "Successfully left the room",
		});
	} catch (error) {
		console.error("Error leaving room:", error);
		res.status(500).json({
			message: "Failed to leave room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Update user role in room (admin only)
 */
export const updateUserRole = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { roomId, userId } = req.params;
		const { role } = req.body;
		const currentUserId = req.user?.id;

		// Validate inputs
		if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			res.status(400).json({ message: "Invalid user ID" });
			return;
		}

		if (!role || !["member", "admin", "moderator"].includes(role)) {
			res.status(400).json({
				message: "Invalid role. Must be member, admin, or moderator",
			});
			return;
		}

		// Check if current user has admin privileges
		const currentUserRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
			isActive: true,
		});

		if (!currentUserRoom || currentUserRoom.role !== "admin") {
			res.status(403).json({
				message: "Only room admins can update user roles",
			});
			return;
		}

		// Find target user room
		const targetUserRoom = await UserRoom.findOne({
			userId: userId,
			roomId: roomId,
			isActive: true,
		});

		if (!targetUserRoom) {
			res.status(404).json({
				message: "User is not a participant in this room",
			});
			return;
		}

		// Update role
		targetUserRoom.role = role as UserRoomRole;
		await targetUserRoom.save();

		const updatedUserRoom = await UserRoom.findById(targetUserRoom._id)
			.populate("userId", "username email avatarUrl")
			.populate("roomId", "name isPrivate");

		res.json({
			message: "User role updated successfully",
			userRoom: updatedUserRoom,
		});
	} catch (error) {
		console.error("Error updating user role:", error);
		res.status(500).json({
			message: "Failed to update user role",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Update last seen timestamp for user in room
 */
export const updateLastSeen = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { roomId } = req.params;
		const currentUserId = req.user?.id;

		// Validate that roomId exists and is a valid ObjectId
		if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: roomId,
			isActive: true,
		});

		if (!userRoom) {
			res.status(403).json({
				message: "You are not a participant in this room",
			});
			return;
		}

		userRoom.lastSeenAt = new Date();
		await userRoom.save();

		res.json({
			message: "Last seen updated successfully",
		});
	} catch (error) {
		console.error("Error updating last seen:", error);
		res.status(500).json({
			message: "Failed to update last seen",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};
