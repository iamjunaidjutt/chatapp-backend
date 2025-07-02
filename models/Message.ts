import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
	content: string;
	sentAt: Date;
	userId: mongoose.Types.ObjectId;
	roomId: mongoose.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
	{
		content: {
			type: String,
			required: true,
			trim: true,
			minlength: 1,
			maxlength: 1000,
		},
		sentAt: {
			type: Date,
			default: Date.now,
		},
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
	},
	{
		timestamps: true,
	}
);

// Index for better performance
MessageSchema.index({ roomId: 1, sentAt: -1 });
MessageSchema.index({ userId: 1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
