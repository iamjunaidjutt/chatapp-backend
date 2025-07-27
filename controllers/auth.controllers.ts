import { Response } from "express";
import bcrypt from "bcryptjs";

import { User } from "../models";
import {
	generateHybridJWT,
	revokeJWTSession,
	revokeAllUserSessions,
	getUserSessions,
	HybridAuthRequest,
} from "../middlewares/hybrid-auth.middlewares";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and registration
 */
const register = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { username, email, password, avatarUrl, role } = req.body;
		if (!username || !email || !password) {
			res.status(400).json({ message: "All fields are required" });
			return;
		}
		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			res.status(400).json({ message: "User already exists" });
			return;
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create new user
		const user = new User({
			username,
			email,
			password: hashedPassword,
			avatarUrl,
			role,
		});
		await user.save();

		res.status(201).json({
			message: "User registered successfully",
			user: {
				id: (user._id as any).toString(),
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
				role: user.role,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const loginWithHybridJWT = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			res.status(400).json({ message: "All fields are required" });
			return;
		}

		// Check if user exists
		const user = await User.findOne({ email });
		if (!user) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		// Generate hybrid JWT token with session
		const { token, sessionId, expiresAt } = await generateHybridJWT(
			{
				id: (user._id as any).toString(),
				email: user.email,
				username: user.username,
			},
			req
		);

		res.status(200).json({
			message: "Login successful",
			token,
			sessionId,
			expiresAt,
			user: {
				id: (user._id as any).toString(),
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Error logging in:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const logoutAllDevices = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Revoke all sessions for the user
		const revokedCount = await revokeAllUserSessions(req.user.id);

		res.json({
			message: `Successfully logged out from ${revokedCount} devices`,
			revokedSessions: revokedCount,
		});
	} catch (error) {
		console.error("Logout all devices error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const getActiveSessions = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Get user's active sessions using the new hybrid system
		const sessions = await getUserSessions(req.user.id);

		res.json({
			sessions: sessions.map((session) => ({
				id: session._id,
				userAgent: session.userAgent,
				ipAddress: session.ipAddress,
				createdAt: session.createdAt,
				lastUsed: session.lastUsed,
				expiresAt: session.expiresAt,
				isCurrent: session._id.toString() === req.sessionId,
			})),
			total: sessions.length,
		});
	} catch (error) {
		console.error("Get active sessions error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const getCurrentUser = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Get user details from database
		const user = await User.findById(req.user.id).select("-password");
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.json({
			user: {
				id: (user._id as any).toString(),
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
				role: user.role,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	} catch (error) {
		console.error("Get current user error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Admin endpoint: Get session statistics
const getSessionStats = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// This could be enhanced to check for admin role
		// For now, any authenticated user can see basic stats
		const totalSessions = await getUserSessions(req.user.id);
		const activeCount = totalSessions.length;

		res.json({
			activeSessions: activeCount,
			totalSessions: activeCount,
			userSessions: totalSessions,
		});
	} catch (error) {
		console.error("Get session stats error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Admin endpoint: Cleanup expired sessions
const cleanupExpiredSessions = async (
	req: HybridAuthRequest,
	res: Response
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Check if user is admin (you can modify this based on your role system)
		const user = await User.findById(req.user.id);
		if (!user || user.role !== "admin") {
			res.status(403).json({ message: "Admin access required" });
			return;
		}

		// Use the new hybrid system's cleanup function
		const { cleanupExpiredSessions: cleanupFn } = await import(
			"../middlewares/hybrid-auth.middlewares"
		);
		const cleanedCount = await cleanupFn();
		res.json({
			message: "Expired sessions cleaned up",
			cleanedCount,
		});
	} catch (error) {
		console.error("Cleanup expired sessions error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const logout = async (req: HybridAuthRequest, res: Response): Promise<void> => {
	try {
		if (!req.sessionId) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Revoke current session
		await revokeJWTSession(req.sessionId);

		res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.error("Logout error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export {
	register,
	loginWithHybridJWT as login,
	logout,
	logoutAllDevices,
	getActiveSessions,
	getCurrentUser,
	getSessionStats,
	cleanupExpiredSessions,
};
