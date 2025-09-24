import { getSocketService } from "./socket.instance";
import { MessageSocketData } from "../types/socket.types";

/**
 * Safely emit new message event
 */
export const safeEmitNewMessage = (messageData: MessageSocketData): void => {
	try {
		const socketService = getSocketService();
		socketService.emitNewMessage(messageData);
	} catch (error) {
		console.warn(
			"Socket service not available for emitting new message:",
			error
		);
	}
};

/**
 * Safely emit message updated event
 */
export const safeEmitMessageUpdated = (
	messageData: MessageSocketData
): void => {
	try {
		const socketService = getSocketService();
		socketService.emitMessageUpdated(messageData);
	} catch (error) {
		console.warn(
			"Socket service not available for emitting message updated:",
			error
		);
	}
};

/**
 * Safely emit message deleted event
 */
export const safeEmitMessageDeleted = (
	messageId: string,
	roomId: string
): void => {
	try {
		const socketService = getSocketService();
		socketService.emitMessageDeleted(messageId, roomId);
	} catch (error) {
		console.warn(
			"Socket service not available for emitting message deleted:",
			error
		);
	}
};

/**
 * Safely emit room updated event
 */
export const safeEmitRoomUpdated = (roomData: any): void => {
	try {
		const socketService = getSocketService();
		socketService.emitRoomUpdated(roomData);
	} catch (error) {
		console.warn(
			"Socket service not available for emitting room updated:",
			error
		);
	}
};

/**
 * Safely send message to specific user
 */
export const safeSendToUser = (
	userId: string,
	event: string,
	data: any
): boolean => {
	try {
		const socketService = getSocketService();
		return socketService.sendToUser(userId, event as any, data);
	} catch (error) {
		console.warn(
			"Socket service not available for sending message to user:",
			error
		);
		return false;
	}
};

/**
 * Safely get active users in room
 */
export const safeGetActiveUsersInRoom = (roomId: string): string[] => {
	try {
		const socketService = getSocketService();
		return socketService.getActiveUsersInRoom(roomId);
	} catch (error) {
		console.warn(
			"Socket service not available for getting active users:",
			error
		);
		return [];
	}
};

/**
 * Safely get typing users in room
 */
export const safeGetTypingUsersInRoom = (
	roomId: string
): Array<{ userId: string; username: string }> => {
	try {
		const socketService = getSocketService();
		return socketService.getTypingUsersInRoom(roomId);
	} catch (error) {
		console.warn(
			"Socket service not available for getting typing users:",
			error
		);
		return [];
	}
};

/**
 * Safely get connected users count
 */
export const safeGetConnectedUsersCount = (): number => {
	try {
		const socketService = getSocketService();
		return socketService.getConnectedUsersCount();
	} catch (error) {
		console.warn(
			"Socket service not available for getting connected users count:",
			error
		);
		return 0;
	}
};

/**
 * Safely get active rooms count
 */
export const safeGetActiveRoomsCount = (): number => {
	try {
		const socketService = getSocketService();
		return socketService.getActiveRoomsCount();
	} catch (error) {
		console.warn(
			"Socket service not available for getting active rooms count:",
			error
		);
		return 0;
	}
};
