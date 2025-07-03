import express from "express";

import {
	getCurrentUser,
	loginWithSession,
	logoutWithSession,
	logoutAllDevices,
	getActiveSessions,
	getSessionStats,
	cleanupExpiredSessions,
} from "../controllers/auth.controllers";
import { register } from "../controllers/user.controllers";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *  post:
 *  summary: Register a new user
 *  tags: [Auth]
 *  requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        type: object
 *        required:
 *          - username
 *          - email
 *          - password
 *        properties:
 *          username:
 *            type: string
 *          email:
 *            type: string
 *            format: email
 *          password:
 *            type: string
 *        responses:
 *          201:
 *            description: User registered successfully
 *          400:
 *            description: Bad request, validation error
 *          409:
 *            description: User already exists
 * */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginWithSession);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", logoutWithSession);
router.post("/logout-all", logoutAllDevices);
router.get("/sessions", getActiveSessions);
router.get("/admin/session-stats", getSessionStats);
router.post("/admin/cleanup-sessions", cleanupExpiredSessions);

router.get("/me", getCurrentUser);

export { router as authRouter };
