import { Request, Response } from "express";
import mongoose from "mongoose";

export class ExpressSessionManager {
	// Get MongoDB sessions collection
	private static getSessionsCollection() {
		if (!mongoose.connection.db) {
			throw new Error("MongoDB connection not established");
		}
		return mongoose.connection.db.collection("sessions");
	}

	// Get all active sessions for a user
	static async getUserActiveSessions(userId: string): Promise<any[]> {
		try {
			const sessions = await this.getSessionsCollection()
				.find({
					session: { $regex: `"userId":"${userId}"` },
					expires: { $gt: new Date() },
				})
				.toArray();

			return sessions;
		} catch (error) {
			console.error("Error getting user active sessions:", error);
			return [];
		}
	}

	// Count active sessions for a user
	static async countUserActiveSessions(userId: string): Promise<number> {
		try {
			const count = await this.getSessionsCollection().countDocuments({
				session: { $regex: `"userId":"${userId}"` },
				expires: { $gt: new Date() },
			});

			return count;
		} catch (error) {
			console.error("Error counting user active sessions:", error);
			return 0;
		}
	}

	// Destroy all sessions for a user except current one
	static async destroyAllUserSessions(
		userId: string,
		currentSessionId?: string
	): Promise<number> {
		try {
			const query: any = {
				session: { $regex: `"userId":"${userId}"` },
			};

			// Exclude current session if provided
			if (currentSessionId) {
				query._id = { $ne: currentSessionId };
			}

			const result = await this.getSessionsCollection().deleteMany(query);
			return result.deletedCount || 0;
		} catch (error) {
			console.error("Error destroying all user sessions:", error);
			return 0;
		}
	}

	// Limit concurrent sessions per user (keep only the most recent ones)
	static async limitConcurrentSessions(
		userId: string,
		maxSessions: number = 3
	): Promise<void> {
		try {
			const sessions = await this.getSessionsCollection()
				.find({
					session: { $regex: `"userId":"${userId}"` },
					expires: { $gt: new Date() },
				})
				.sort({ expires: -1 }) // Sort by most recent
				.toArray();

			if (sessions.length > maxSessions) {
				// Keep only the most recent sessions
				const sessionsToDelete = sessions.slice(maxSessions);
				const sessionIds = sessionsToDelete.map((s) => s._id);

				await this.getSessionsCollection().deleteMany({
					_id: { $in: sessionIds },
				});

				console.log(
					`Removed ${sessionIds.length} old sessions for user ${userId}`
				);
			}
		} catch (error) {
			console.error("Error limiting concurrent sessions:", error);
			throw new Error("Failed to limit concurrent sessions");
		}
	}

	// Clean up expired sessions
	static async cleanupExpiredSessions(): Promise<number> {
		try {
			const result = await this.getSessionsCollection().deleteMany({
				expires: { $lt: new Date() },
			});

			return result.deletedCount || 0;
		} catch (error) {
			console.error("Error cleaning up expired sessions:", error);
			return 0;
		}
	}

	// Get session statistics
	static async getSessionStats() {
		try {
			const [totalSessions, activeSessions, expiredSessions] =
				await Promise.all([
					this.getSessionsCollection().countDocuments(),
					this.getSessionsCollection().countDocuments({
						expires: { $gt: new Date() },
					}),
					this.getSessionsCollection().countDocuments({
						expires: { $lt: new Date() },
					}),
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

	// Get current session ID from request
	static getCurrentSessionId(req: Request): string | null {
		return req.sessionID || null;
	}
}
