import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models";

export const socketAuthMiddleware = async (
	socket: Socket,
	next: (err?: Error) => void
) => {
	try {
		// Extract token from handshake auth or query
		const token =
			socket.handshake.auth?.token || socket.handshake.query?.token;

		if (!token) {
			return next(new Error("Authentication required"));
		}

		// Verify JWT token
		const decoded = jwt.verify(
			token as string,
			process.env.JWT_SECRET!
		) as { id: string };

		// Get user from database
		const user = (await User.findById(decoded.id).select(
			"-password"
		)) as IUser | null;
		if (!user) {
			return next(new Error("User not found"));
		}

		// Attach user to socket
		(socket as any).userId = (user._id as any).toString();
		(socket as any).user = {
			id: (user._id as any).toString(),
			username: user.username,
			email: user.email,
			avatarUrl: user.avatarUrl,
		};

		next();
	} catch (error) {
		console.error("Socket authentication error:", error);
		next(new Error("Authentication failed"));
	}
};
