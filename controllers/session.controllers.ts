import { Response } from "express";
import { Session } from "../models/session.models";
import { User } from "../models";
import { HybridAuthRequest } from "../middlewares/hybrid-auth.middlewares";

// Get all active sessions for a user
export const getUserSessions = async (
	req: HybridAuthRequest,
	res: Response
) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: "Authentication required",
			});
			return;
		}

		const sessions = await Session.find({
			userId,
			isActive: true,
			expiresAt: { $gt: new Date() },
		})
			.select("-jwtToken -tokenHash") // Don't expose sensitive token data
			.sort({ lastUsed: -1 });

		res.json({
			success: true,
			data: {
				sessions,
				totalActiveSessions: sessions.length,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to fetch sessions",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// Revoke a specific session
export const revokeSession = async (req: HybridAuthRequest, res: Response) => {
	try {
		const { sessionId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: "Authentication required",
			});
			return;
		}

		const session = await Session.findOneAndUpdate(
			{
				_id: sessionId,
				userId,
				isActive: true,
			},
			{
				isActive: false,
				lastUsed: new Date(),
			},
			{ new: true }
		);

		if (!session) {
			res.status(404).json({
				success: false,
				message: "Session not found or already revoked",
			});
			return;
		}

		res.json({
			success: true,
			message: "Session revoked successfully",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to revoke session",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// Revoke all sessions except current one
export const revokeAllOtherSessions = async (
	req: HybridAuthRequest,
	res: Response
) => {
	try {
		const userId = req.user?.id;
		const currentSessionId = req.session?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: "Authentication required",
			});
			return;
		}

		const result = await Session.updateMany(
			{
				userId,
				isActive: true,
				_id: { $ne: currentSessionId },
			},
			{
				isActive: false,
				lastUsed: new Date(),
			}
		);

		res.json({
			success: true,
			message: `${result.modifiedCount} sessions revoked successfully`,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to revoke sessions",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// Logout from current session
export const logout = async (req: HybridAuthRequest, res: Response) => {
	try {
		const sessionId = req.session?.id;
		const userId = req.user?.id;

		if (!sessionId || !userId) {
			res.status(400).json({
				success: false,
				message: "No active session found",
			});
			return;
		}

		await Session.findOneAndUpdate(
			{ _id: sessionId, userId },
			{
				isActive: false,
				lastUsed: new Date(),
			}
		);

		res.json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to logout",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// Admin: Get all sessions (for admin users)
export const getAllSessions = async (req: HybridAuthRequest, res: Response) => {
	try {
		// Check if user is admin
		if (!req.user) {
			res.status(401).json({
				success: false,
				message: "Authentication required",
			});
			return;
		}

		// Get full user data to check role
		const user = await User.findById(req.user.id);
		if (!user || user.role !== "admin") {
			res.status(403).json({
				success: false,
				message: "Access denied. Admin role required.",
			});
			return;
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 20;
		const skip = (page - 1) * limit;

		const sessions = await Session.find({
			isActive: true,
			expiresAt: { $gt: new Date() },
		})
			.populate("userId", "name email")
			.select("-jwtToken -tokenHash")
			.sort({ lastUsed: -1 })
			.skip(skip)
			.limit(limit);

		const totalSessions = await Session.countDocuments({
			isActive: true,
			expiresAt: { $gt: new Date() },
		});

		res.json({
			success: true,
			data: {
				sessions,
				pagination: {
					page,
					limit,
					totalSessions,
					totalPages: Math.ceil(totalSessions / limit),
				},
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to fetch sessions",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// Cleanup expired sessions (can be called via cron job)
export const cleanupExpiredSessions = async (
	req: HybridAuthRequest,
	res: Response
) => {
	try {
		const result = await Session.deleteMany({
			$or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
		});

		res.json({
			success: true,
			message: `${result.deletedCount} expired sessions cleaned up`,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to cleanup sessions",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};
