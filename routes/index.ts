import { Router } from "express";
import { router as userRouter } from "./user.routes";
import { router as roomRouter } from "./roomRouter";
import { router as messageRouter } from "./messageRouter";
import { authRouter } from "./auth.routes";

const router = Router();

// Mount the routers
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/rooms", roomRouter);
router.use("/messages", messageRouter);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health Check
 *     description: Check if the API is running
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat App API is running!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
router.get("/", (req, res) => {
	res.json({
		message: "Chat App API is running!",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
});

export { router };
