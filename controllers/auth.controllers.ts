import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../models";
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and registration
 */
const register = async (req: Request, res: Response): Promise<void> => {
	try {
		const { username, email, password, avatarUrl } = req.body;
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
		});
		await user.save();

		res.status(201).json(user);
	} catch (error) {
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

export {
	register,
	loginWithJwt,
	loginWithSession,
	logoutWithSession,
	getCurrentUser,
};
