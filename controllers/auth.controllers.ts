import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../models";
import { ExpressSessionManager } from "../utils/express-session-manager.utils";
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and registration
 */
const register = async (req: Request, res: Response): Promise<void> => {
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
				id: user._id,
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

const loginWithJwt = async (req: Request, res: Response): Promise<void> => {
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

		// Generate JWT token
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
			expiresIn: "1h",
		});

		res.status(200).json({ token });
	} catch (error) {
		console.error("Error logging in:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const loginWithSession = async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			res.status(400).json({
				message: "Email and password are required",
			});
			return;
		}

		// Find user by email
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		// Check password
		const isValidPassword = await bcrypt.compare(password, user.password);
		if (!isValidPassword) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		// Create session
		(req.session as any).userId = user._id?.toString();
		(req.session as any).username = user.username;
		(req.session as any).email = user.email;
		(req.session as any).isAuthenticated = true;

		// Limit concurrent sessions after creating the session
		if (user._id) {
			await ExpressSessionManager.limitConcurrentSessions(
				user._id.toString(),
				3
			);
		}

		res.json({
			message: "Login successful",
			user: {
				id: user._id,
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const logoutWithSession = (req: Request, res: Response): void => {
	req.session.destroy((err) => {
		if (err) {
			console.error("Session destroy error:", err);
			res.status(500).json({ message: "Could not log out" });
			return;
		}
		res.clearCookie("connect.sid"); // Clear the session cookie
		res.json({ message: "Logout successful" });
	});
};

const logoutAllDevices = async (req: Request, res: Response): Promise<void> => {
	try {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Not authenticated" });
			return;
		}

		const userId = (req.session as any).userId;
		const currentSessionId = ExpressSessionManager.getCurrentSessionId(req);

		// Destroy all sessions for this user
		const destroyedCount =
			await ExpressSessionManager.destroyAllUserSessions(userId);

		// Also destroy current session
		req.session.destroy((err) => {
			if (err) {
				console.error("Session destroy error:", err);
			}
		});

		res.clearCookie("connect.sid");
		res.json({
			message: "Logged out from all devices",
			sessionsDestroyed: destroyedCount + 1, // +1 for current session
		});
	} catch (error) {
		console.error("Logout all devices error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const getActiveSessions = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Not authenticated" });
			return;
		}

		const userId = (req.session as any).userId;
		const sessions = await ExpressSessionManager.getUserActiveSessions(
			userId
		);

		// Parse and clean up session data for response
		const sessionData = sessions.map((session) => {
			let sessionInfo;
			try {
				sessionInfo = JSON.parse(session.session);
			} catch (e) {
				sessionInfo = {};
			}

			return {
				id: session._id,
				expires: session.expires,
				lastActivity: sessionInfo.cookie?.expires || session.expires,
				isCurrent: session._id === req.sessionID,
			};
		});

		res.json({
			sessions: sessionData,
			total: sessionData.length,
		});
	} catch (error) {
		console.error("Get active sessions error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
	try {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Not authenticated" });
			return;
		}

		const user = await User.findById((req.session as any).userId).select(
			"-password"
		);
		if (!user) {
			res.status(401).json({ message: "User not found" });
			return;
		}

		res.json({
			user: {
				id: user._id,
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
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
const getSessionStats = async (req: Request, res: Response): Promise<void> => {
	try {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Not authenticated" });
			return;
		}

		// Check if user is admin (you can modify this based on your role system)
		const user = await User.findById((req.session as any).userId);
		if (!user || user.role !== "admin") {
			res.status(403).json({ message: "Admin access required" });
			return;
		}

		const stats = await ExpressSessionManager.getSessionStats();
		res.json(stats);
	} catch (error) {
		console.error("Get session stats error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Admin endpoint: Cleanup expired sessions
const cleanupExpiredSessions = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Not authenticated" });
			return;
		}

		// Check if user is admin
		const user = await User.findById((req.session as any).userId);
		if (!user || user.role !== "admin") {
			res.status(403).json({ message: "Admin access required" });
			return;
		}

		const cleanedCount =
			await ExpressSessionManager.cleanupExpiredSessions();
		res.json({
			message: "Expired sessions cleaned up",
			cleanedCount,
		});
	} catch (error) {
		console.error("Cleanup expired sessions error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export {
	register,
	loginWithJwt,
	loginWithSession,
	logoutWithSession,
	logoutAllDevices,
	getActiveSessions,
	getCurrentUser,
	getSessionStats,
	cleanupExpiredSessions,
};
