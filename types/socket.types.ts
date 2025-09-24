import { Socket } from "socket.io";
import mongoose from "mongoose";

// Socket Events Interface
export interface ServerToClientEvents {
	// Message events
	newMessage: (data: MessageSocketData) => void;
	messageUpdated: (data: MessageSocketData) => void;
	messageDeleted: (data: { messageId: string; roomId: string }) => void;

	// User presence events
	userJoined: (data: UserPresenceData) => void;
	userLeft: (data: UserPresenceData) => void;
	userOnline: (data: UserPresenceData) => void;
	userOffline: (data: UserPresenceData) => void;

	// Room events
	roomUpdated: (data: RoomSocketData) => void;
	userJoinedRoom: (data: RoomMembershipData) => void;
	userLeftRoom: (data: RoomMembershipData) => void;

	// Typing events
	userTyping: (data: TypingData) => void;
	userStoppedTyping: (data: TypingData) => void;

	// Error events
	error: (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
	// Connection events
	joinRoom: (data: { roomId: string }) => void;
	leaveRoom: (data: { roomId: string }) => void;

	// Message events
	sendMessage: (data: SendMessageData) => void;

	// Typing events
	startTyping: (data: { roomId: string }) => void;
	stopTyping: (data: { roomId: string }) => void;

	// Presence events
	updatePresence: (data: { status: "online" | "away" | "offline" }) => void;
}

export interface InterServerEvents {
	// Events between server instances (for scaling)
	userConnected: (data: { userId: string; socketId: string }) => void;
	userDisconnected: (data: { userId: string; socketId: string }) => void;
}

export interface SocketData {
	userId?: string;
	user?: {
		id: string;
		username: string;
		email: string;
		avatarUrl?: string;
	};
}

// Data Types
export interface MessageSocketData {
	_id: string;
	content: string;
	sentAt: Date;
	userId: {
		_id: string;
		username: string;
		email: string;
		avatarUrl?: string | undefined;
	};
	roomId: string;
	messageType: "text" | "image" | "file";
	isEdited: boolean;
	editedAt?: Date | undefined;
}

export interface UserPresenceData {
	userId: string;
	username: string;
	avatarUrl?: string | undefined;
	roomId?: string;
	isOnline: boolean;
}

export interface RoomSocketData {
	_id: string;
	name?: string;
	description?: string;
	isPrivate: boolean;
	maxParticipants?: number;
	participantCount: number;
}

export interface RoomMembershipData {
	userId: string;
	username: string;
	avatarUrl?: string | undefined;
	roomId: string;
	roomName?: string;
	role: string;
}

export interface TypingData {
	userId: string;
	username: string;
	roomId: string;
}

export interface SendMessageData {
	roomId: string;
	content: string;
	messageType?: "text" | "image" | "file";
}

// Enhanced Socket interface with user data
export interface AuthenticatedSocket
	extends Socket<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	> {
	userId?: string;
	user?: {
		id: string;
		username: string;
		email: string;
		avatarUrl?: string | undefined;
	};
}

// Room tracking
export interface ActiveRoom {
	roomId: string;
	participants: Set<string>; // socket IDs
	typingUsers: Map<
		string,
		{ userId: string; username: string; timeout?: NodeJS.Timeout }
	>;
}

// User session tracking
export interface UserSession {
	userId: string;
	socketId: string;
	user: {
		id: string;
		username: string;
		email: string;
		avatarUrl?: string | undefined;
	};
	joinedAt: Date;
	lastActivity: Date;
	rooms: Set<string>; // room IDs user has joined
}
