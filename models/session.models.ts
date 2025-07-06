import mongoose from "mongoose";

// Session schema for tracking JWT sessions
const sessionSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	jwtToken: {
		type: String,
		required: true,
		unique: true,
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

export const JWTSession = mongoose.model("JWTSession", sessionSchema);

// Session interface for TypeScript
export interface IJWTSession {
	_id: string;
	userId: string;
	jwtToken: string;
	tokenHash: string;
	userAgent?: string;
	ipAddress?: string;
	isActive: boolean;
	createdAt: Date;
	lastUsed: Date;
	expiresAt: Date;
}
