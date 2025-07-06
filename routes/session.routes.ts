import { Router } from "express";
import {
	getUserSessions,
	logout,
	revokeSession,
	revokeAllOtherSessions,
	getAllSessions,
	cleanupExpiredSessions,
} from "../controllers/session.controllers";
import { verifyHybridJWT } from "../middlewares/hybrid-auth.middlewares";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: JWT session management for hybrid authentication
 */

// All session routes require authentication
router.use(verifyHybridJWT);

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Sessions]
 *     description: Retrieve all active sessions for the authenticated user
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Session'
 *                     totalActiveSessions:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
// Get current user's sessions
router.get("/", getUserSessions);

/**
 * @swagger
 * /sessions/logout:
 *   post:
 *     summary: Logout from current session
 *     tags: [Sessions]
 *     description: Revoke the current JWT session
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
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       400:
 *         description: No active session found
 *       500:
 *         description: Internal server error
 */
// Logout from current session
router.post("/logout", logout);

/**
 * @swagger
 * /sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Sessions]
 *     description: Revoke a specific session by ID (must belong to the authenticated user)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         description: Session ID to revoke
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Session revoked successfully"
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Session not found or already revoked
 *       500:
 *         description: Internal server error
 */
// Revoke a specific session
router.delete("/:sessionId", revokeSession);

/**
 * @swagger
 * /sessions/revoke-all-others:
 *   post:
 *     summary: Revoke all other sessions
 *     tags: [Sessions]
 *     description: Revoke all sessions except the current one
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Other sessions revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "3 sessions revoked successfully"
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
// Revoke all other sessions (keep current one)
router.post("/revoke-all-others", revokeAllOtherSessions);

/**
 * @swagger
 * /sessions/admin/all:
 *   get:
 *     summary: Get all sessions (Admin only)
 *     tags: [Sessions]
 *     description: Retrieve all active sessions across all users (requires admin role)
 *     security:
 *       - hybridAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         description: Number of sessions per page
 *         schema:
 *           type: integer
 *           example: 20
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Session'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalSessions:
 *                           type: integer
 *                           example: 150
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Internal server error
 */
// Admin routes
router.get("/admin/all", getAllSessions);

/**
 * @swagger
 * /sessions/cleanup:
 *   post:
 *     summary: Cleanup expired sessions
 *     tags: [Sessions]
 *     description: Remove expired and inactive sessions from the database
 *     security:
 *       - hybridAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "15 expired sessions cleaned up"
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
// Cleanup expired sessions (can be called by admin or cron job)
router.post("/cleanup", cleanupExpiredSessions);

export default router;
