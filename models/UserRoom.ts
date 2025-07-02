import mongoose, { Document, Schema } from "mongoose";

export interface IUserRoom extends Document {
	userId: mongoose.Types.ObjectId;
	roomId: mongoose.Types.ObjectId;
	joinedAt: Date;
	createdAt: Date;
	updatedAt: Date;
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
		joinedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	}
);

// Ensure unique combination of userId and roomId
UserRoomSchema.index({ userId: 1, roomId: 1 }, { unique: true });

export const UserRoom = mongoose.model<IUserRoom>("UserRoom", UserRoomSchema);
