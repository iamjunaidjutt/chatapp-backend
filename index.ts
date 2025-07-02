import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";

import { router } from "./routes";
import { logger } from "./middlewares/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { config } from "./config";
import { setupSwagger } from "./swagger";

async function startServer() {
	try {
		const dbUrl = process.env.DATABASE_URL;
		if (!dbUrl) throw new Error("DATABASE_URL is not defined.");

		// 1) Connect to MongoDB
		await mongoose.connect(dbUrl);
		console.log("✅ connected to MongoDB");

		// 2) Build Express
		const app = express();

		const sessionStore = MongoStore.create({
			mongoUrl: dbUrl,
			collectionName: "sessions",
			ttl: 1 * 24 * 60 * 60, // 1 day in seconds
			autoRemove: "native", // Use MongoDB's native TTL feature
		});

		app.use(cors());
		app.use(logger);
		app.use(express.json());

		// Configure session middleware
		app.use(
			session({
				secret:
					process.env.SESSION_SECRET ||
					"your-secret-key-change-in-production",
				resave: false,
				saveUninitialized: false,
				store: sessionStore,
				cookie: {
					secure: process.env.NODE_ENV === "production", // HTTPS only in production
					httpOnly: true, // Prevent XSS attacks
					maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day in milliseconds
				},
			})
		);

		setupSwagger(app);
		app.use("/api", router);
		app.use(errorHandler);

		// 3) Create HTTP + Socket.IO server
		const server = createServer(app);
		const io = new Server(server, {
			cors: {
				origin: config.clientUrl,
				methods: ["GET", "POST"],
			},
		});

		io.on("connection", (socket) => {
			console.log("A user connected:", socket.id);
			socket.on("disconnect", () =>
				console.log("User disconnected:", socket.id)
			);
			// …more events…
		});

		// 4) Start listening
		server.listen(config.port, () => {
			console.log(`🚀 Server is running on port ${config.port}`);
		});

		// 5) (Optional) Log future disconnects/errors
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
