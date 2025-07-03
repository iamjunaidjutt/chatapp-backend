import crypto from "crypto";
import { Session, ISession } from "../models/session.models";
import { Request } from "express";

export class SessionManager {
	// Generate a secure session token
	static generateSessionToken(): string {
		return crypto.randomBytes(32).toString("hex");
	}

	// Create a new session
	static async createSession(
		userId: string,
		req: Request,
		expiresInDays: number = 7
	): Promise<ISession> {
		try {
			const sessionToken = this.generateSessionToken();
			const expires = new Date();
			expires.setDate(expires.getDate() + expiresInDays);

			const session = new Session({
				userId,
				sessionToken,
				expires,
				userAgent: req.get("User-Agent"),
				ipAddress: req.ip || req.connection.remoteAddress,
				isActive: true,
				lastActivity: new Date(),
			});

			return await session.save();
		} catch (error) {
			console.error("Error creating session:", error);
			throw new Error("Failed to create session");
		}
	}

	// Validate and get session
	static async validateSession(
		sessionToken: string
	): Promise<ISession | null> {
		try {
			const session = await Session.findOne({
				sessionToken,
				isActive: true,
				expires: { $gt: new Date() },
			}).populate("userId");

			if (session) {
				// Update last activity
				session.lastActivity = new Date();
				await session.save();
			}

			return session;
		} catch (error) {
			console.error("Error validating session:", error);
			return null;
		}
	}

	// Invalidate a specific session
	static async invalidateSession(sessionToken: string): Promise<boolean> {
		try {
			const result = await Session.updateOne(
				{ sessionToken },
				{ isActive: false }
			);
			return result.modifiedCount > 0;
		} catch (error) {
			console.error("Error invalidating session:", error);
			return false;
		}
	}

	// Invalidate all sessions for a user
	static async invalidateAllUserSessions(userId: string): Promise<number> {
		try {
			const result = await Session.updateMany(
				{ userId, isActive: true },
				{ isActive: false }
			);
			return result.modifiedCount;
		} catch (error) {
			console.error("Error invalidating all user sessions:", error);
			return 0;
		}
	}

	// Get all active sessions for a user
	static async getUserActiveSessions(userId: string): Promise<ISession[]> {
		try {
			return await Session.find({
				userId,
				isActive: true,
				expires: { $gt: new Date() },
			}).sort({ lastActivity: -1 });
		} catch (error) {
			console.error("Error getting user active sessions:", error);
			return [];
		}
	}

	// Clean up expired sessions (run this periodically)
	static async cleanupExpiredSessions(): Promise<number> {
		try {
			const result = await Session.deleteMany({
				$or: [{ expires: { $lt: new Date() } }, { isActive: false }],
			});
			return result.deletedCount;
		} catch (error) {
			console.error("Error cleaning up expired sessions:", error);
			return 0;
		}
	}

	// Limit concurrent sessions per user
	static async limitConcurrentSessions(
		userId: string,
		maxSessions: number = 5
	): Promise<void> {
		try {
			const activeSessions = await this.getUserActiveSessions(userId);

			if (activeSessions.length >= maxSessions) {
				// Deactivate oldest sessions
				const sessionsToDeactivate = activeSessions.slice(
					maxSessions - 1
				);
				const sessionTokens = sessionsToDeactivate.map(
					(s) => s.sessionToken
				);

				await Session.updateMany(
					{ sessionToken: { $in: sessionTokens } },
					{ isActive: false }
				);
			}
		} catch (error) {
			console.error("Error limiting concurrent sessions:", error);
			throw new Error("Failed to limit concurrent sessions");
		}
	}

	// Get session info for admin dashboard
	static async getSessionStats() {
		try {
			const [totalSessions, activeSessions, expiredSessions] =
				await Promise.all([
					Session.countDocuments(),
					Session.countDocuments({
						isActive: true,
						expires: { $gt: new Date() },
					}),
					Session.countDocuments({ expires: { $lt: new Date() } }),
				]);

			return {
				total: totalSessions,
				active: activeSessions,
				expired: expiredSessions,
			};
		} catch (error) {
			console.error("Error getting session stats:", error);
			return {
				total: 0,
				active: 0,
				expired: 0,
			};
		}
	}
}
