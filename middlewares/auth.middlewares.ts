import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if user is authenticated via session
 */
export const requireAuth = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (!(req.session as any).isAuthenticated || !(req.session as any).userId) {
		res.status(401).json({
			message: "Authentication required. Please log in first.",
		});
		return;
	}
	next();
};

/**
 * Optional auth middleware - continues even if not authenticated
 * Adds user info to request if available
 */
export const optionalAuth = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	// User info is already available in req.session if authenticated
	// This middleware doesn't block the request
	next();
};

/**
 * Middleware to check if user owns a resource (by userId)
 */
export const requireOwnership = (userIdField: string = "userId") => {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (
			!(req.session as any).isAuthenticated ||
			!(req.session as any).userId
		) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		const resourceUserId =
			req.body[userIdField] ||
			req.params[userIdField] ||
			req.query[userIdField];

		if (resourceUserId !== (req.session as any).userId) {
			res.status(403).json({
				message:
					"Access denied. You can only access your own resources.",
			});
			return;
		}

		next();
	};
};
