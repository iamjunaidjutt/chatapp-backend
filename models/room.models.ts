import mongoose, { Document, Schema } from "mongoose";

export interface IRoom extends Document {
	name?: string;
	isPrivate: boolean;
	participants: mongoose.Types.ObjectId[]; // Array of user IDs
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
		isPrivate: {
			type: Boolean,
			required: true,
			default: false,
		},
		participants: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
		],
	},
	{
		timestamps: true,
	}
);

export const Room = mongoose.model<IRoom>("Room", RoomSchema);
