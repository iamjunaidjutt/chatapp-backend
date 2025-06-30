import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { router } from "./routes";
import { logger } from "./middlewares/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { config } from "./config";
import { setupSwagger } from "./swagger";

const app = express();
app.use(cors());
app.use(logger);
app.use(express.json());

// Setup Swagger documentation
setupSwagger(app);

app.use("/api", router);
app.use(errorHandler);

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: config.clientUrl,
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);

	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
	});

	// Add more event listeners as needed
});

server.listen(config.port, () => {
	console.log(`Server is running on port ${config.port}`);
});
