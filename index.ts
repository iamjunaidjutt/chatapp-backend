import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { router } from "./routes";
import { logger } from "./middlewares/logger.middlewares";
import { errorHandler } from "./middlewares/error-handler.middlewares";
import { config } from "./config";
import { setupSwagger } from "./swagger";
import { initializeSocketService } from "./utils/socket.instance";
import {
	ServerToClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	SocketData,
} from "./types/socket.types";

async function startServer() {
	try {
		const dbUrl = process.env.DATABASE_URL;
		if (!dbUrl) throw new Error("DATABASE_URL is not defined.");

		// 1) Connect to MongoDB
		await mongoose.connect(dbUrl);
		console.log("✅ connected to MongoDB");

		// 2) Build Express
		const app = express();

		app.use(cors());
		app.use(logger);
		app.use(express.json());

		setupSwagger(app);
		app.use("/api", router);
		app.use(errorHandler);

		// 3) Create HTTP + Socket.IO server
		const server = createServer(app);
		const io = new Server<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>(server, {
			cors: {
				origin: config.clientUrl,
				methods: ["GET", "POST"],
			},
		});

		// 4) Initialize Socket Service
		const socketService = initializeSocketService(io);
		console.log("✅ Socket service initialized");

		// 5) Start listening
		server.listen(config.port, () => {
			console.log(`🚀 Server is running on port ${config.port}`);
			console.log(`📡 Socket.IO server is ready for connections`);
		});

		// 6) Setup periodic session cleanup (every 24 hours)
		setInterval(async () => {
			try {
				const { cleanupExpiredSessions } = await import(
					"./middlewares/hybrid-auth.middlewares"
				);
				const cleanedCount = await cleanupExpiredSessions();
				console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
			} catch (error) {
				console.error("Error during periodic session cleanup:", error);
			}
		}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

		// Run initial cleanup on server start
		setTimeout(async () => {
			try {
				const { cleanupExpiredSessions } = await import(
					"./middlewares/hybrid-auth.middlewares"
				);
				const cleanedCount = await cleanupExpiredSessions();
				console.log(
					`🧹 Initial cleanup: removed ${cleanedCount} expired sessions`
				);
			} catch (error) {
				console.error("Error during initial session cleanup:", error);
			}
		}, 5000); // Wait 5 seconds after server start

		// 7) (Optional) Log future disconnects/errors
		mongoose.connection.on("error", (err) =>
			console.error("Mongoose connection error:", err)
		);
		mongoose.connection.on("disconnected", () =>
			console.warn("⚠️ Mongoose disconnected")
		);
	} catch (err) {
		console.error("Error starting the server:", err);
		process.exit(1);
	}
}

startServer();
