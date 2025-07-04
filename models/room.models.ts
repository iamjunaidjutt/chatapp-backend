import mongoose, { Document, Schema } from "mongoose";

export interface IRoom extends Document {
	name?: string;
	description?: string;
	isPrivate: boolean;
	maxParticipants?: number;
	createdBy?: mongoose.Types.ObjectId; // User who created the room
	createdAt: Date;
	updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
	{
		name: {
			type: String,
			trim: true,
			default: null,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 500,
		},
		isPrivate: {
			type: Boolean,
			required: true,
			default: false,
		},
		maxParticipants: {
			type: Number,
			default: null, // null means unlimited
			min: 2,
			max: 1000,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

export const Room = mongoose.model<IRoom>("Room", RoomSchema);
