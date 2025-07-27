import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
	username: string;
	email: string;
	password: string;
	role?: UserRole; // Optional role, defaults to 'user'
	avatarUrl?: string;
	isOnline: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export enum UserRole {
	USER = "user",
	ADMIN = "admin",
}

const UserSchema = new Schema<IUser>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
		},
		role: {
			type: String,
			enum: Object.values(UserRole), // Use enum values for validation
			default: UserRole.USER,
		},
		avatarUrl: {
			type: String,
			default: null,
		},
		isOnline: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true, // This automatically adds createdAt and updatedAt
	}
);

export const User = mongoose.model<IUser>("User", UserSchema);
