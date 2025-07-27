import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import moment from "moment";

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

if (!process.env.JWT_SECRET) {
	console.warn(
		"⚠️  JWT_SECRET not set in environment variables, using default (insecure for production)"
	);
}

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
	const token = jwt.sign(payload, JWT_SECRET, {
		expiresIn: "1d",
	});

	// Calculate expiration date - ensure it matches JWT expiration
	// For "1d" format, add 1 day to current time
	const expiresAt = moment().add(1, "day").toDate();

	const tokenHash = await bcrypt.hash(token, 10); // Hash the token for storage

	// Create session record in database
	const session = new JWTSession({
		userId: user.id,
		tokenHash,
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
		return result.deletedCount ?? 0;
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

			const session = await JWTSession.findOne({
				userId: decoded.id,
				isActive: true,
				expiresAt: { $gt: new Date() },
			});

			if (!session) {
				// Debug logging for development
				if (process.env.NODE_ENV === "development") {
					console.log("🔍 Token validation failed:");
					console.log("- Looking for active session with this hash");

					// Check if session exists but is inactive or expired
					const inactiveSession = await JWTSession.findOne({
						userId: decoded.id,
					});
					if (inactiveSession) {
						console.log("- Found session but it is:", {
							isActive: inactiveSession.isActive,
							expiresAt: inactiveSession.expiresAt,
							now: new Date(),
							expired: inactiveSession.expiresAt < new Date(),
						});
					} else {
						console.log("- No session found with this user ID");
						console.log(
							"- Total active sessions:",
							await JWTSession.countDocuments({ isActive: true })
						);
					}
				}

				res.status(401).json({
					message:
						"Session expired or invalid. Please login again to get a fresh token.",
				});
				return;
			}

			//compare token hash
			const match = await bcrypt.compare(token, session?.tokenHash);
			if (!match) {
				res.status(401).json({
					message:
						"Session expired or invalid. Please login again to get a fresh token.",
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
					userId: decoded.id,
					isActive: true,
					expiresAt: { $gt: new Date() },
				});

				if (session) {
					// Update last used timestamp
					session.lastUsed = new Date();
					await session.save();

					// Compare token hash
					const match = await bcrypt.compare(
						token,
						session.tokenHash
					);
					if (!match) {
						res.status(401).json({
							message:
								"Session expired or invalid. Please login again to get a fresh token.",
						});
						return;
					}

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
