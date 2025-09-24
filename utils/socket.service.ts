import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User, UserRoom, Room } from "../models";
import {
	ServerToClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	SocketData,
	AuthenticatedSocket,
	ActiveRoom,
	UserSession,
	MessageSocketData,
	UserPresenceData,
	RoomMembershipData,
	TypingData,
} from "../types/socket.types";

export class SocketService {
	private io: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>;

	// Track active rooms and users
	private activeRooms = new Map<string, ActiveRoom>();
	private userSessions = new Map<string, UserSession>(); // socketId -> UserSession
	private userSocketMap = new Map<string, string>(); // userId -> socketId

	constructor(
		io: Server<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>
	) {
		this.io = io;
		this.setupSocketHandlers();
	}

	private setupSocketHandlers(): void {
		this.io.on("connection", (socket: AuthenticatedSocket) => {
			console.log(`Socket connected: ${socket.id}`);

			// Handle authentication
			this.authenticateSocket(socket);
		});
	}

	private async authenticateSocket(
		socket: AuthenticatedSocket
	): Promise<void> {
		try {
			// Extract token from handshake auth or query
			const token =
				socket.handshake.auth?.token || socket.handshake.query?.token;

			if (!token) {
				socket.emit("error", {
					message: "Authentication required",
					code: "AUTH_REQUIRED",
				});
				socket.disconnect();
				return;
			}

			// Verify JWT token
			const decoded = jwt.verify(
				token as string,
				process.env.JWT_SECRET!
			) as { id: string };

			// Get user from database
			const user = await User.findById(decoded.id).select("-password");
			if (!user) {
				socket.emit("error", {
					message: "User not found",
					code: "USER_NOT_FOUND",
				});
				socket.disconnect();
				return;
			}

			// Set user data on socket
			socket.userId = (user._id as any).toString();
			socket.user = {
				id: (user._id as any).toString(),
				username: user.username,
				email: user.email,
				avatarUrl: user.avatarUrl,
			};

			// Update user's online status
			await User.findByIdAndUpdate(user._id, { isOnline: true });

			// Track user session
			const userSession: UserSession = {
				userId: (user._id as any).toString(),
				socketId: socket.id,
				user: socket.user,
				joinedAt: new Date(),
				lastActivity: new Date(),
				rooms: new Set(),
			};

			this.userSessions.set(socket.id, userSession);
			this.userSocketMap.set((user._id as any).toString(), socket.id);

			console.log(`User authenticated: ${user.username} (${socket.id})`);

			// Setup socket event handlers for authenticated user
			this.setupAuthenticatedSocketHandlers(socket);

			// Notify user's rooms about online status
			await this.broadcastUserPresence(socket.userId!, true);
		} catch (error) {
			console.error("Socket authentication error:", error);
			socket.emit("error", {
				message: "Authentication failed",
				code: "AUTH_FAILED",
			});
			socket.disconnect();
		}
	}

	private setupAuthenticatedSocketHandlers(
		socket: AuthenticatedSocket
	): void {
		// Join room
		socket.on("joinRoom", async (data) => {
			try {
				await this.handleJoinRoom(socket, data.roomId);
			} catch (error) {
				console.error("Join room error:", error);
				socket.emit("error", { message: "Failed to join room" });
			}
		});

		// Leave room
		socket.on("leaveRoom", async (data) => {
			try {
				await this.handleLeaveRoom(socket, data.roomId);
			} catch (error) {
				console.error("Leave room error:", error);
				socket.emit("error", { message: "Failed to leave room" });
			}
		});

		// Start typing
		socket.on("startTyping", async (data) => {
			try {
				await this.handleStartTyping(socket, data.roomId);
			} catch (error) {
				console.error("Start typing error:", error);
			}
		});

		// Stop typing
		socket.on("stopTyping", async (data) => {
			try {
				await this.handleStopTyping(socket, data.roomId);
			} catch (error) {
				console.error("Stop typing error:", error);
			}
		});

		// Update presence
		socket.on("updatePresence", async (data) => {
			try {
				await this.handleUpdatePresence(socket, data.status);
			} catch (error) {
				console.error("Update presence error:", error);
			}
		});

		// Handle disconnect
		socket.on("disconnect", async () => {
			await this.handleDisconnect(socket);
		});
	}

	private async handleJoinRoom(
		socket: AuthenticatedSocket,
		roomId: string
	): Promise<void> {
		if (!socket.userId) return;

		// Verify user has access to the room
		const userRoom = await UserRoom.findOne({
			userId: socket.userId,
			roomId: roomId,
			isActive: true,
		});

		if (!userRoom) {
			socket.emit("error", {
				message: "Access denied to room",
				code: "ROOM_ACCESS_DENIED",
			});
			return;
		}

		// Join socket room
		socket.join(roomId);

		// Track room membership
		const userSession = this.userSessions.get(socket.id);
		if (userSession) {
			userSession.rooms.add(roomId);
		}

		// Initialize room if not exists
		if (!this.activeRooms.has(roomId)) {
			this.activeRooms.set(roomId, {
				roomId,
				participants: new Set(),
				typingUsers: new Map(),
			});
		}

		const activeRoom = this.activeRooms.get(roomId)!;
		activeRoom.participants.add(socket.id);

		console.log(`User ${socket.user?.username} joined room ${roomId}`);

		// Notify other users in the room
		const roomMembershipData: RoomMembershipData = {
			userId: socket.userId,
			username: socket.user!.username,
			avatarUrl: socket.user!.avatarUrl,
			roomId,
			role: userRoom.role,
		};

		socket.to(roomId).emit("userJoinedRoom", roomMembershipData);
	}

	private async handleLeaveRoom(
		socket: AuthenticatedSocket,
		roomId: string
	): Promise<void> {
		if (!socket.userId) return;

		socket.leave(roomId);

		// Update tracking
		const userSession = this.userSessions.get(socket.id);
		if (userSession) {
			userSession.rooms.delete(roomId);
		}

		const activeRoom = this.activeRooms.get(roomId);
		if (activeRoom) {
			activeRoom.participants.delete(socket.id);

			// Clear typing status
			activeRoom.typingUsers.delete(socket.id);

			// Clean up empty room
			if (activeRoom.participants.size === 0) {
				this.activeRooms.delete(roomId);
			}
		}

		console.log(`User ${socket.user?.username} left room ${roomId}`);

		// Notify other users in the room
		const roomMembershipData: RoomMembershipData = {
			userId: socket.userId,
			username: socket.user!.username,
			avatarUrl: socket.user!.avatarUrl,
			roomId,
			role: "member", // Default role for leaving
		};

		socket.to(roomId).emit("userLeftRoom", roomMembershipData);
	}

	private async handleStartTyping(
		socket: AuthenticatedSocket,
		roomId: string
	): Promise<void> {
		if (!socket.userId) return;

		const activeRoom = this.activeRooms.get(roomId);
		if (!activeRoom) return;

		// Clear existing timeout
		const existingTyping = activeRoom.typingUsers.get(socket.id);
		if (existingTyping?.timeout) {
			clearTimeout(existingTyping.timeout);
		}

		// Set typing status with auto-clear timeout
		const timeout = setTimeout(() => {
			this.handleStopTyping(socket, roomId);
		}, 10000); // Auto-stop typing after 10 seconds

		activeRoom.typingUsers.set(socket.id, {
			userId: socket.userId,
			username: socket.user!.username,
			timeout,
		});

		// Broadcast to other users in the room
		const typingData: TypingData = {
			userId: socket.userId,
			username: socket.user!.username,
			roomId,
		};

		socket.to(roomId).emit("userTyping", typingData);
	}

	private async handleStopTyping(
		socket: AuthenticatedSocket,
		roomId: string
	): Promise<void> {
		if (!socket.userId) return;

		const activeRoom = this.activeRooms.get(roomId);
		if (!activeRoom) return;

		const existingTyping = activeRoom.typingUsers.get(socket.id);
		if (existingTyping) {
			// Clear timeout
			if (existingTyping.timeout) {
				clearTimeout(existingTyping.timeout);
			}

			// Remove from typing users
			activeRoom.typingUsers.delete(socket.id);

			// Broadcast to other users in the room
			const typingData: TypingData = {
				userId: socket.userId,
				username: socket.user!.username,
				roomId,
			};

			socket.to(roomId).emit("userStoppedTyping", typingData);
		}
	}

	private async handleUpdatePresence(
		socket: AuthenticatedSocket,
		status: "online" | "away" | "offline"
	): Promise<void> {
		if (!socket.userId) return;

		// Update user session
		const userSession = this.userSessions.get(socket.id);
		if (userSession) {
			userSession.lastActivity = new Date();
		}

		// Update database if going offline
		if (status === "offline") {
			await User.findByIdAndUpdate(socket.userId, { isOnline: false });
		} else {
			await User.findByIdAndUpdate(socket.userId, { isOnline: true });
		}

		// Broadcast presence to user's rooms
		await this.broadcastUserPresence(socket.userId, status !== "offline");
	}

	private async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
		if (!socket.userId) return;

		console.log(
			`User ${socket.user?.username} disconnected (${socket.id})`
		);

		// Update user offline status
		await User.findByIdAndUpdate(socket.userId, { isOnline: false });

		// Clean up user session
		this.userSessions.delete(socket.id);
		this.userSocketMap.delete(socket.userId);

		// Clean up rooms
		const userSession = this.userSessions.get(socket.id);
		if (userSession) {
			for (const roomId of userSession.rooms) {
				const activeRoom = this.activeRooms.get(roomId);
				if (activeRoom) {
					activeRoom.participants.delete(socket.id);

					// Clear typing status
					const existingTyping = activeRoom.typingUsers.get(
						socket.id
					);
					if (existingTyping) {
						if (existingTyping.timeout) {
							clearTimeout(existingTyping.timeout);
						}
						activeRoom.typingUsers.delete(socket.id);

						// Notify room that user stopped typing
						const typingData: TypingData = {
							userId: socket.userId!,
							username: socket.user!.username,
							roomId,
						};
						socket.to(roomId).emit("userStoppedTyping", typingData);
					}

					// Notify room that user left
					const roomMembershipData: RoomMembershipData = {
						userId: socket.userId!,
						username: socket.user!.username,
						avatarUrl: socket.user!.avatarUrl,
						roomId,
						role: "member",
					};
					socket.to(roomId).emit("userLeftRoom", roomMembershipData);

					// Clean up empty room
					if (activeRoom.participants.size === 0) {
						this.activeRooms.delete(roomId);
					}
				}
			}
		}

		// Broadcast offline status to user's rooms
		await this.broadcastUserPresence(socket.userId, false);
	}

	private async broadcastUserPresence(
		userId: string,
		isOnline: boolean
	): Promise<void> {
		try {
			// Get user's rooms
			const userRooms = await UserRoom.find({
				userId,
				isActive: true,
			}).populate("userId");

			if (userRooms.length === 0) return;

			const user = await User.findById(userId).select(
				"username avatarUrl"
			);
			if (!user) return;

			const presenceData: UserPresenceData = {
				userId,
				username: user.username,
				avatarUrl: user.avatarUrl,
				isOnline,
			};

			// Broadcast to each room
			for (const userRoom of userRooms) {
				const event = isOnline ? "userOnline" : "userOffline";
				this.io.to(userRoom.roomId.toString()).emit(event, {
					...presenceData,
					roomId: userRoom.roomId.toString(),
				});
			}
		} catch (error) {
			console.error("Error broadcasting user presence:", error);
		}
	}

	// Public methods for controllers to use
	public emitNewMessage(messageData: MessageSocketData): void {
		this.io.to(messageData.roomId).emit("newMessage", messageData);
	}

	public emitMessageUpdated(messageData: MessageSocketData): void {
		this.io.to(messageData.roomId).emit("messageUpdated", messageData);
	}

	public emitMessageDeleted(messageId: string, roomId: string): void {
		this.io.to(roomId).emit("messageDeleted", { messageId, roomId });
	}

	public emitRoomUpdated(roomData: any): void {
		this.io.to(roomData._id).emit("roomUpdated", roomData);
	}

	// Get active users in a room
	public getActiveUsersInRoom(roomId: string): string[] {
		const activeRoom = this.activeRooms.get(roomId);
		if (!activeRoom) return [];

		return Array.from(activeRoom.participants)
			.map((socketId) => this.userSessions.get(socketId)?.userId)
			.filter((userId) => userId) as string[];
	}

	// Get typing users in a room
	public getTypingUsersInRoom(
		roomId: string
	): Array<{ userId: string; username: string }> {
		const activeRoom = this.activeRooms.get(roomId);
		if (!activeRoom) return [];

		return Array.from(activeRoom.typingUsers.values()).map((typing) => ({
			userId: typing.userId,
			username: typing.username,
		}));
	}

	// Get total connected users
	public getConnectedUsersCount(): number {
		return this.userSessions.size;
	}

	// Get active rooms count
	public getActiveRoomsCount(): number {
		return this.activeRooms.size;
	}

	// Send message to specific user
	public sendToUser(
		userId: string,
		event: keyof ServerToClientEvents,
		data: any
	): boolean {
		const socketId = this.userSocketMap.get(userId);
		if (socketId) {
			const socket = this.io.sockets.sockets.get(socketId);
			if (socket) {
				(socket as any).emit(event, data);
				return true;
			}
		}
		return false;
	}
}
