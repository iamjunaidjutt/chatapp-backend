import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTSession } from "../models/session.models";

// Extend Request interface to include user info
export interface HybridAuthRequest extends Request {
	user?: {
		id: string;
		email: string;
		username?: string;
	};
	sessionId?: string;
	session?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-development-only";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!process.env.JWT_SECRET) {
	console.warn(
		"⚠️  JWT_SECRET not set in environment variables, using default (insecure for production)"
	);
}

// Helper function to create token hash for database storage
const createTokenHash = (token: string): string => {
	const crypto = require("crypto");
	return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate JWT token and create session in database
 */
export const generateHybridJWT = async (
	user: {
		id: string;
		email: string;
		username?: string;
	},
	req?: Request
) => {
	// Generate JWT token
	const payload = {
		id: user.id,
		email: user.email,
		username: user.username,
	};
	const token = jwt.sign(payload, JWT_SECRET as string, {
		expiresIn: "7d",
	});

	// Calculate expiration date
	const expiresAt = new Date();
	const expiresInMs = JWT_EXPIRES_IN.includes("d")
		? parseInt(JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000
		: parseInt(JWT_EXPIRES_IN) * 1000;
	expiresAt.setTime(expiresAt.getTime() + expiresInMs);

	// Create session record in database
	const session = new JWTSession({
		userId: user.id,
		jwtToken: token,
		tokenHash: createTokenHash(token),
		userAgent: req?.headers["user-agent"],
		ipAddress: req?.ip || req?.connection?.remoteAddress,
		expiresAt,
	});

	await session.save();

	return {
		token,
		sessionId: session._id.toString(),
		expiresAt,
	};
};

/**
 * Revoke a specific JWT session
 */
export const revokeJWTSession = async (sessionId: string): Promise<boolean> => {
	try {
		const result = await JWTSession.findByIdAndUpdate(
			sessionId,
			{ isActive: false },
			{ new: true }
		);
		return !!result;
	} catch (error) {
		console.error("Error revoking JWT session:", error);
		return false;
	}
};

/**
 * Revoke all JWT sessions for a user
 */
export const revokeAllUserSessions = async (
	userId: string
): Promise<number> => {
	try {
		const result = await JWTSession.updateMany(
			{ userId, isActive: true },
			{ isActive: false }
		);
		return result.modifiedCount;
	} catch (error) {
		console.error("Error revoking all user sessions:", error);
		return 0;
	}
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
	try {
		const result = await JWTSession.deleteMany({
			$or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
		});
		return result.deletedCount;
	} catch (error) {
		console.error("Error cleaning up expired sessions:", error);
		return 0;
	}
};

/**
 * Hybrid JWT + Session verification middleware
 */
export const verifyHybridJWT = (
	req: HybridAuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const authenticate = async () => {
		try {
			const authHeader = req.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				res.status(401).json({
					message: "Access denied. No token provided.",
				});
				return;
			}

			const token = authHeader.substring(7); // Remove "Bearer " prefix

			// Verify JWT token
			const decoded = jwt.verify(token, JWT_SECRET) as any;

			// Check if session exists and is active in database
			const session = await JWTSession.findOne({
				tokenHash: createTokenHash(token),
				isActive: true,
				expiresAt: { $gt: new Date() },
			});

			if (!session) {
				res.status(401).json({
					message: "Session expired or invalid.",
				});
				return;
			}

			// Update last used timestamp
			session.lastUsed = new Date();
			await session.save();

			// Add user info to request
			req.user = {
				id: decoded.id,
				email: decoded.email,
				username: decoded.username,
			};
			req.sessionId = session._id.toString();

			next();
		} catch (error) {
			if (error instanceof jwt.JsonWebTokenError) {
				res.status(401).json({
					message: "Invalid token.",
				});
			} else {
				console.error("Error in hybrid JWT verification:", error);
				res.status(500).json({
					message: "Authentication error.",
				});
			}
		}
	};

	authenticate();
};

/**
 * Optional hybrid JWT middleware - continues even if no token provided
 */
export const optionalHybridJWT = (
	req: HybridAuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const authenticate = async () => {
		try {
			const authHeader = req.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				// No token provided, continue without user info
				next();
				return;
			}

			const token = authHeader.substring(7);

			try {
				// Verify JWT token
				const decoded = jwt.verify(token, JWT_SECRET) as any;

				// Check if session exists and is active in database
				const session = await JWTSession.findOne({
					tokenHash: createTokenHash(token),
					isActive: true,
					expiresAt: { $gt: new Date() },
				});

				if (session) {
					// Update last used timestamp
					session.lastUsed = new Date();
					await session.save();

					// Add user info to request
					req.user = {
						id: decoded.id,
						email: decoded.email,
						username: decoded.username,
					};
					req.sessionId = session._id.toString();
				}
			} catch (error) {
				// Invalid token or session, but continue without user info
				console.warn("Invalid JWT token or session:", error);
			}

			next();
		} catch (error) {
			// Any other error, continue without user info
			next();
		}
	};

	authenticate();
};

/**
 * Middleware to check if user owns a resource (by userId)
 */
export const requireHybridOwnership = (userIdField: string = "userId") => {
	return (
		req: HybridAuthRequest,
		res: Response,
		next: NextFunction
	): void => {
		if (!req.user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		const resourceUserId =
			req.body[userIdField] ||
			req.params[userIdField] ||
			req.query[userIdField];

		if (resourceUserId !== req.user.id) {
			res.status(403).json({
				message:
					"Access denied. You can only access your own resources.",
			});
			return;
		}

		next();
	};
};

/**
 * Get user's active sessions
 */
export const getUserSessions = async (userId: string) => {
	try {
		const sessions = await JWTSession.find({
			userId,
			isActive: true,
			expiresAt: { $gt: new Date() },
		})
			.select("userAgent ipAddress createdAt lastUsed expiresAt")
			.sort({ lastUsed: -1 });

		return sessions;
	} catch (error) {
		console.error("Error getting user sessions:", error);
		return [];
	}
};
