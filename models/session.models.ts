import mongoose from "mongoose";

// Session interface for TypeScript
export interface ISession {
	_id: string;
	userId: mongoose.Types.ObjectId;
	tokenHash: string;
	userAgent?: string;
	ipAddress?: string;
	isActive: boolean;
	createdAt: Date;
	lastUsed: Date;
	expiresAt: Date;
}

// Session schema for tracking JWT sessions
const sessionSchema = new mongoose.Schema<ISession>({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	tokenHash: {
		type: String,
		required: true,
		index: true,
	},
	userAgent: String,
	ipAddress: String,
	isActive: {
		type: Boolean,
		default: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	lastUsed: {
		type: Date,
		default: Date.now,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
});

// TTL index to automatically delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);
