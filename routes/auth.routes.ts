import express from "express";

import {
	register,
	login,
	getCurrentUser,
	logoutAllDevices,
	getActiveSessions,
	getSessionStats,
	cleanupExpiredSessions,
} from "../controllers/auth.controllers";
import { verifyHybridJWT } from "../middlewares/hybrid-auth.middlewares";

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
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: Create a new user account with username, email, and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Unique username for the account
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password (minimum 6 characters)
 *                 example: "securePassword123"
 *               avatarUrl:
 *                 type: string
 *                 nullable: true
 *                 description: Optional avatar image URL
 *                 example: "https://example.com/avatar.jpg"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User role (defaults to 'user')
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "6865252b6728b7af025ea7b5"
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/avatar.jpg"
 *                     role:
 *                       type: string
 *                       example: "user"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-03T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-03T10:30:00.000Z"
 *       400:
 *         description: Bad request - validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     description: Authenticate user with email and password, creates JWT token and MongoDB session
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
 *                 description: User's email address
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful - Returns JWT token and session information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email and password are required"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 *       500:
 *         description: Internal server error
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     description: Destroys the current user session and clears session cookie
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *       500:
 *         description: Could not log out - session destroy error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not log out"
 */
// Note: Logout functionality is now handled by the session controller

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     description: Destroys all active sessions for the current user across all devices
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out from all devices"
 *                 sessionsDestroyed:
 *                   type: number
 *                   example: 3
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authenticated"
 *       500:
 *         description: Internal server error
 */
router.post("/logout-all", verifyHybridJWT, logoutAllDevices);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get active sessions for current user
 *     tags: [Auth]
 *     description: Returns a list of all active sessions for the authenticated user
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Session ID
 *                         example: "TF8aRxoJbDCMH8RPie9FAu6ZdQt4dOZ5"
 *                       expires:
 *                         type: string
 *                         format: date-time
 *                         description: Session expiration date
 *                         example: "2025-07-04T02:20:52.936Z"
 *                       lastActivity:
 *                         type: string
 *                         format: date-time
 *                         description: Last activity timestamp
 *                         example: "2025-07-04T02:20:52.936Z"
 *                       isCurrent:
 *                         type: boolean
 *                         description: Whether this is the current session
 *                         example: true
 *                 total:
 *                   type: number
 *                   description: Total number of active sessions
 *                   example: 3
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
router.get("/sessions", verifyHybridJWT, getActiveSessions);

/**
 * @swagger
 * /auth/admin/session-stats:
 *   get:
 *     summary: Get session statistics (Admin only)
 *     tags: [Auth]
 *     description: Returns overall session statistics for administrative purposes. Requires admin role.
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Session statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: Total number of sessions in database
 *                   example: 25
 *                 active:
 *                   type: number
 *                   description: Number of active (non-expired) sessions
 *                   example: 18
 *                 expired:
 *                   type: number
 *                   description: Number of expired sessions
 *                   example: 7
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authenticated"
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Admin access required"
 *       500:
 *         description: Internal server error
 */
router.get("/admin/session-stats", verifyHybridJWT, getSessionStats);

/**
 * @swagger
 * /auth/admin/cleanup-sessions:
 *   post:
 *     summary: Cleanup expired sessions (Admin only)
 *     tags: [Auth]
 *     description: Manually trigger cleanup of expired sessions from the database. Requires admin role.
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Expired sessions cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Expired sessions cleaned up"
 *                 cleanedCount:
 *                   type: number
 *                   description: Number of sessions that were cleaned up
 *                   example: 7
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authenticated"
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Admin access required"
 *       500:
 *         description: Internal server error
 */
router.post("/admin/cleanup-sessions", verifyHybridJWT, cleanupExpiredSessions);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     description: Returns information about the currently authenticated user
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                       example: "6865252b6728b7af025ea7b5"
 *                     username:
 *                       type: string
 *                       description: Username
 *                       example: "admin"
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User email
 *                       example: "admin@yopmail.com"
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *                       description: User avatar URL
 *                       example: "https://example.com/avatar.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Account creation date
 *                       example: "2025-07-01T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last profile update date
 *                       example: "2025-07-03T15:45:00.000Z"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authenticated"
 *       500:
 *         description: Internal server error
 */
router.get("/me", verifyHybridJWT, getCurrentUser);

export { router as authRouter };
