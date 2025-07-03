import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
	userId: mongoose.Types.ObjectId;
	sessionToken: string;
	expires: Date;
	userAgent?: string;
	ipAddress?: string;
	isActive: boolean;
	lastActivity: Date;
	createdAt: Date;
	updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		sessionToken: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		expires: {
			type: Date,
			required: true,
			index: true,
		},
		userAgent: {
			type: String,
			default: null,
		},
		ipAddress: {
			type: String,
			default: null,
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},
		lastActivity: {
			type: Date,
			default: Date.now,
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

// Index for cleanup of expired sessions
SessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

// Index for finding active sessions by user
SessionSchema.index({ userId: 1, isActive: 1 });

// Static method to clean up expired sessions
SessionSchema.statics.cleanupExpiredSessions = async function () {
	return this.deleteMany({
		$or: [{ expires: { $lt: new Date() } }, { isActive: false }],
	});
};

// Static method to get active sessions for a user
SessionSchema.statics.getActiveSessions = async function (userId: string) {
	return this.find({
		userId,
		isActive: true,
		expires: { $gt: new Date() },
	}).sort({ lastActivity: -1 });
};

// Static method to revoke all sessions for a user
SessionSchema.statics.revokeAllUserSessions = async function (userId: string) {
	return this.updateMany({ userId, isActive: true }, { isActive: false });
};

export const Session = mongoose.model<ISession>("Session", SessionSchema);
