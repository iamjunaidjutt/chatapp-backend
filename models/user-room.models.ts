import mongoose, { Document, Schema } from "mongoose";

export interface IUserRoom extends Document {
	userId: mongoose.Types.ObjectId;
	roomId: mongoose.Types.ObjectId;
	role: UserRoomRole;
	joinedAt: Date;
	lastSeenAt?: Date;
	isActive: boolean;
	notifications: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export enum UserRoomRole {
	MEMBER = "member",
	ADMIN = "admin",
	MODERATOR = "moderator",
}

const UserRoomSchema = new Schema<IUserRoom>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		roomId: {
			type: Schema.Types.ObjectId,
			ref: "Room",
			required: true,
		},
		role: {
			type: String,
			enum: Object.values(UserRoomRole),
			default: UserRoomRole.MEMBER,
			required: true,
		},
		joinedAt: {
			type: Date,
			default: Date.now,
		},
		lastSeenAt: {
			type: Date,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		notifications: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
);

// Ensure unique combination of userId and roomId
UserRoomSchema.index({ userId: 1, roomId: 1 }, { unique: true });
// Index for better performance on queries
UserRoomSchema.index({ roomId: 1, isActive: 1 });
UserRoomSchema.index({ userId: 1, isActive: 1 });

export const UserRoom = mongoose.model<IUserRoom>("UserRoom", UserRoomSchema);
