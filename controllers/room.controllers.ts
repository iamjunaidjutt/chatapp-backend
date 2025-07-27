import { Response } from "express";
import mongoose from "mongoose";
import { Room, UserRoom, UserRoomRole } from "../models";
import { HybridAuthRequest } from "../middlewares/hybrid-auth.middlewares";

/**
 * Get all rooms
 */
export const getAllRooms = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const rooms = await Room.find({})
			.populate("createdBy", "username email avatarUrl")
			.sort({ createdAt: -1 });

		// Get participant counts for each room
		const roomsWithCounts = await Promise.all(
			rooms.map(async (room) => {
				const participantCount = await UserRoom.countDocuments({
					roomId: room._id,
					isActive: true,
				});
				return {
					...room.toObject(),
					participantCount,
				};
			})
		);

		res.status(200).json({
			message: "Rooms retrieved successfully",
			rooms: roomsWithCounts,
			total: rooms.length,
		});
	} catch (error) {
		console.error("Error getting rooms:", error);
		res.status(500).json({
			message: "Failed to retrieve rooms",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Get room by ID
 */
export const getRoomById = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		const room = await Room.findById(id).populate(
			"createdBy",
			"username email avatarUrl"
		);

		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Get participant count and check if current user is a participant
		const participantCount = await UserRoom.countDocuments({
			roomId: id,
			isActive: true,
		});

		const isParticipant = await UserRoom.findOne({
			userId: req.user?.id,
			roomId: id,
			isActive: true,
		});

		res.status(200).json({
			message: "Room retrieved successfully",
			room: {
				...room.toObject(),
				participantCount,
				isParticipant: !!isParticipant,
			},
		});
	} catch (error) {
		console.error("Error getting room by ID:", error);
		res.status(500).json({
			message: "Failed to retrieve room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Create a new room
 */
export const createRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const {
			name,
			description,
			isPrivate = false,
			maxParticipants,
		} = req.body;
		const currentUserId = req.user?.id;

		if (!currentUserId) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Validation
		if (!name || name.trim().length === 0) {
			res.status(400).json({ message: "Room name is required" });
			return;
		}

		if (name.trim().length > 50) {
			res.status(400).json({
				message: "Room name must be 50 characters or less",
			});
			return;
		}

		if (description && description.trim().length > 500) {
			res.status(400).json({
				message: "Room description must be 500 characters or less",
			});
			return;
		}

		if (
			maxParticipants &&
			(maxParticipants < 2 || maxParticipants > 1000)
		) {
			res.status(400).json({
				message: "Max participants must be between 2 and 1000",
			});
			return;
		}

		// Check if room with same name already exists
		const existingRoom = await Room.findOne({ name: name.trim() });
		if (existingRoom) {
			res.status(409).json({
				message: "Room with this name already exists",
			});
			return;
		}

		const room = new Room({
			name: name.trim(),
			description: description?.trim(),
			isPrivate,
			maxParticipants,
			createdBy: currentUserId,
		});

		await room.save();

		// Add creator as admin in UserRoom
		const userRoom = new UserRoom({
			userId: currentUserId,
			roomId: room._id,
			role: UserRoomRole.ADMIN,
		});

		await userRoom.save();

		// Populate the created room
		const populatedRoom = await Room.findById(room._id).populate(
			"createdBy",
			"username email avatarUrl"
		);

		res.status(201).json({
			message: "Room created successfully",
			room: {
				...populatedRoom?.toObject(),
				participantCount: 1,
				isParticipant: true,
			},
		});
	} catch (error) {
		console.error("Error creating room:", error);
		res.status(500).json({
			message: "Failed to create room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Update room
 */
export const updateRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const { name, description, isPrivate, maxParticipants } = req.body;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		const room = await Room.findById(id);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user has permission to update (creator or admin)
		const userRoom = await UserRoom.findOne({
			userId: currentUserId,
			roomId: id,
			isActive: true,
		});

		if (
			!userRoom ||
			(room.createdBy?.toString() !== currentUserId &&
				userRoom.role !== UserRoomRole.ADMIN &&
				userRoom.role !== UserRoomRole.MODERATOR)
		) {
			res.status(403).json({
				message: "You don't have permission to update this room",
			});
			return;
		}

		// Update fields
		if (name !== undefined) {
			if (!name || name.trim().length === 0) {
				res.status(400).json({ message: "Room name cannot be empty" });
				return;
			}
			if (name.trim().length > 50) {
				res.status(400).json({
					message: "Room name must be 50 characters or less",
				});
				return;
			}
			room.name = name.trim();
		}

		if (description !== undefined) {
			if (description && description.trim().length > 500) {
				res.status(400).json({
					message: "Room description must be 500 characters or less",
				});
				return;
			}
			room.description = description?.trim();
		}

		if (isPrivate !== undefined) {
			room.isPrivate = isPrivate;
		}

		if (maxParticipants !== undefined) {
			if (
				maxParticipants &&
				(maxParticipants < 2 || maxParticipants > 1000)
			) {
				res.status(400).json({
					message: "Max participants must be between 2 and 1000",
				});
				return;
			}
			room.maxParticipants = maxParticipants;
		}

		await room.save();

		const updatedRoom = await Room.findById(room._id).populate(
			"createdBy",
			"username email avatarUrl"
		);

		const participantCount = await UserRoom.countDocuments({
			roomId: id,
			isActive: true,
		});

		res.json({
			message: "Room updated successfully",
			room: {
				...updatedRoom?.toObject(),
				participantCount,
			},
		});
	} catch (error) {
		console.error("Error updating room:", error);
		res.status(500).json({
			message: "Failed to update room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};

/**
 * Delete room
 */
export const deleteRoom = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;
		const currentUserId = req.user?.id;

		// Validate that ID exists and is a valid ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ message: "Invalid room ID" });
			return;
		}

		const room = await Room.findById(id);
		if (!room) {
			res.status(404).json({ message: "Room not found" });
			return;
		}

		// Check if user has permission to delete (creator only)
		if (room.createdBy?.toString() !== currentUserId) {
			res.status(403).json({
				message: "Only the room creator can delete this room",
			});
			return;
		}

		// Delete all UserRoom relationships for this room
		await UserRoom.deleteMany({ roomId: id });

		// Delete the room
		await Room.findByIdAndDelete(id);

		res.json({
			message: "Room deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting room:", error);
		res.status(500).json({
			message: "Failed to delete room",
			error: process.env.NODE_ENV === "development" ? error : undefined,
		});
	}
};
