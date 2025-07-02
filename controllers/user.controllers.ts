import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { IUser, User } from "../models";

const getAllUsers = async (req: Request, res: Response): Promise<void> => {
	try {
		const users = await User.find({}).select("-password");
		res.status(200).json({
			message: "Users retrieved successfully",
			users,
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Failed to fetch users" });
	}
};

const getUserById = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;

		const user = await User.findById(id).select("-password");

		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json(user);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Failed to fetch user" });
	}
};

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

		res.status(201).json(user);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
};

const login = async (req: Request, res: Response): Promise<void> => {
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

const updateUser = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		const { username, email, avatarUrl } = req.body;

		// Check if user exists
		const existingUser = await User.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// Prepare update data
		const updateData: Partial<IUser> = {};

		if (username) updateData.username = username;
		if (email) updateData.email = email;
		if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

		// Check for username/email conflicts
		if (username || email) {
			const conflictUser = await User.findOne({
				_id: { $ne: id }, // Exclude current user
				$or: [
					{ username: updateData.username },
					{ email: updateData.email },
				],
			});
			if (conflictUser) {
				res.status(409).json({
					message: "Username or email already exists",
				});
				return;
			}
		}

		// Update user
		const updatedUser = await User.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true,
		}).select("-password");

		if (!updatedUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json({
			message: "User updated successfully",
			user: { ...updatedUser },
		});
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ message: "Failed to update user" });
	}
};

const deleteUser = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;

		const deletedUser = await User.findByIdAndDelete(id);

		if (!deletedUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json({
			message: "User deleted successfully",
			user: {
				...deleteUser,
			},
		});
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Failed to delete user" });
	}
};

export { getAllUsers, getUserById, register, login, updateUser, deleteUser };
