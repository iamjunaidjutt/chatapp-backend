import { Request, Response, NextFunction } from "express";

import { SessionManager } from "../utils/session-manager.utils";
import { User } from "../models/user.models";

// Extend Express Request type to include user and sessionData
declare global {
	namespace Express {
		interface Request {
			user?: any;
			sessionData?: any; // Use your ISession type if available
		}
	}
}

export const sessionAuth = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// Get session token from cookie or Authorization header
		const sessionToken =
			req.cookies?.sessionToken ||
			req.header("Authorization")?.replace("Bearer ", "");

		if (!sessionToken) {
			return res.status(401).json({
				success: false,
				message: "No session token provided",
			});
		}

		// Validate session
		const session = await SessionManager.validateSession(sessionToken);

		if (!session) {
			return res.status(401).json({
				success: false,
				message: "Invalid or expired session",
			});
		}

		// Get user details
		const user = await User.findById(session.userId).select("-password");

		if (!user) {
			return res.status(401).json({
				success: false,
				message: "User not found",
			});
		}
		// Attach user and session to request
		req.user = user;
		req.sessionData = session;

		next();
		return;
	} catch (error) {
		console.error("Session authentication error:", error);
		res.status(500).json({
			success: false,
			message: "Authentication error",
		});
		return;
	}
};

// Optional authentication - doesn't fail if no session
export const optionalSessionAuth = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const sessionToken =
			req.cookies?.sessionToken ||
			req.header("Authorization")?.replace("Bearer ", "");

		if (sessionToken) {
			const session = await SessionManager.validateSession(sessionToken);
			if (session) {
				const user = await User.findById(session.userId).select(
					"-password"
				);
				if (user) {
					req.user = user;
					req.sessionData = session;
				}
			}
		}

		next();
	} catch (error) {
		console.error("Optional session authentication error:", error);
		next(); // Continue even if there's an error
	}
};

// Admin only middleware
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
	if (!req.user || req.user.role !== "admin") {
		return res.status(403).json({
			success: false,
			message: "Admin access required",
		});
	}
	next();
	return;
};
