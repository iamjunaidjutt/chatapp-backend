import { Server } from "socket.io";
import { SocketService } from "./socket.service";
import {
	ServerToClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	SocketData,
} from "../types/socket.types";

// Global socket service instance
let socketService: SocketService | null = null;

export const initializeSocketService = (
	io: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>
): SocketService => {
	socketService = new SocketService(io);
	return socketService;
};

export const getSocketService = (): SocketService => {
	if (!socketService) {
		throw new Error(
			"SocketService not initialized. Call initializeSocketService first."
		);
	}
	return socketService;
};
