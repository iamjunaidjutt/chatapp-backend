import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Chat App API",
			version: "2.0.0",
			description:
				"A real-time chat application API built with Express, Socket.IO, and MongoDB. Uses hybrid JWT + MongoDB session authentication for secure and scalable user management.",
			contact: {
				name: "API Support",
				email: "support@chatapp.com",
			},
		},
		servers: [
			{
				url: "http://localhost:8000/api",
				description: "Development server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description:
						"JWT token authentication. Use the token received from login endpoint.",
				},
				hybridAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description:
						"Hybrid JWT + Session authentication. The JWT token is validated and session is maintained in MongoDB.",
				},
			},
			schemas: {
				User: {
					type: "object",
					required: ["username", "email", "password"],
					properties: {
						id: {
							type: "string",
							description: "The auto-generated id of the user",
							example: "507f1f77bcf86cd799439011",
						},
						username: {
							type: "string",
							description: "The user's unique username",
							example: "john_doe",
						},
						email: {
							type: "string",
							format: "email",
							description: "The user's email address",
							example: "john@example.com",
						},
						password: {
							type: "string",
							description: "The user's password (hashed)",
							example: "hashedpassword123",
						},
						avatarUrl: {
							type: "string",
							format: "uri",
							description: "URL to the user's profile picture",
							example: "https://example.com/avatar.jpg",
							nullable: true,
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description: "The date the user was created",
						},
						updatedAt: {
							type: "string",
							format: "date-time",
							description: "The date the user was last updated",
						},
					},
				},
				Room: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: "The auto-generated id of the room",
							example: "507f1f77bcf86cd799439012",
						},
						name: {
							type: "string",
							description: "The room name (null for DMs)",
							example: "general",
							nullable: true,
							maxLength: 50,
						},
						isPrivate: {
							type: "boolean",
							description: "Whether the room is private",
							example: false,
							default: false,
						},
						description: {
							type: "string",
							description: "Room description",
							example: "A room for general discussions",
							maxLength: 500,
						},
						maxParticipants: {
							type: "number",
							description:
								"Maximum number of participants (null means unlimited)",
							example: 100,
							minimum: 2,
							maximum: 1000,
							nullable: true,
						},
						createdBy: {
							type: "string",
							description:
								"The id of the user who created the room",
							example: "507f1f77bcf86cd799439011",
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description: "The date the room was created",
						},
						updatedAt: {
							type: "string",
							format: "date-time",
							description: "The date the room was last updated",
						},
					},
				},
				Message: {
					type: "object",
					required: ["content", "userId", "roomId"],
					properties: {
						id: {
							type: "string",
							description: "The auto-generated id of the message",
							example: "507f1f77bcf86cd799439013",
						},
						content: {
							type: "string",
							description: "The message content",
							example: "Hello, everyone!",
							maxLength: 1000,
						},
						sentAt: {
							type: "string",
							format: "date-time",
							description: "The date the message was sent",
						},
						userId: {
							type: "string",
							description:
								"The id of the user who sent the message",
							example: "507f1f77bcf86cd799439011",
						},
						roomId: {
							type: "string",
							description:
								"The id of the room the message was sent to",
							example: "507f1f77bcf86cd799439012",
						},
						messageType: {
							type: "string",
							description: "The type of message",
							enum: ["text", "image", "file"],
							default: "text",
							example: "text",
						},
						isEdited: {
							type: "boolean",
							description: "Whether the message has been edited",
							default: false,
							example: false,
						},
						editedAt: {
							type: "string",
							format: "date-time",
							description:
								"The date the message was last edited (if edited)",
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description: "The date the message was created",
						},
						updatedAt: {
							type: "string",
							format: "date-time",
							description:
								"The date the message was last updated",
						},
					},
				},
				UserRoom: {
					type: "object",
					required: ["userId", "roomId", "role"],
					properties: {
						id: {
							type: "string",
							description:
								"The auto-generated id of the user-room relationship",
							example: "507f1f77bcf86cd799439014",
						},
						userId: {
							type: "string",
							description: "The id of the user",
							example: "507f1f77bcf86cd799439011",
						},
						roomId: {
							type: "string",
							description: "The id of the room",
							example: "507f1f77bcf86cd799439012",
						},
						role: {
							type: "string",
							enum: ["member", "admin", "moderator"],
							description: "The user's role in the room",
							example: "member",
						},
						joinedAt: {
							type: "string",
							format: "date-time",
							description: "The date the user joined the room",
						},
						lastSeenAt: {
							type: "string",
							format: "date-time",
							description:
								"The date the user was last seen in the room",
						},
						isActive: {
							type: "boolean",
							description:
								"Whether the user is currently active in the room",
							example: true,
						},
						notifications: {
							type: "boolean",
							description:
								"Whether the user has notifications enabled for this room",
							example: true,
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description:
								"The date the relationship was created",
						},
						updatedAt: {
							type: "string",
							format: "date-time",
							description:
								"The date the relationship was last updated",
						},
					},
				},
				Session: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: "The auto-generated id of the session",
							example: "507f1f77bcf86cd799439015",
						},
						userId: {
							type: "string",
							description:
								"The id of the user who owns this session",
							example: "507f1f77bcf86cd799439011",
						},
						jwtToken: {
							type: "string",
							description:
								"The JWT token (not returned in API responses)",
						},
						tokenHash: {
							type: "string",
							description: "Hash of the JWT token for validation",
						},
						userAgent: {
							type: "string",
							description: "Browser/client user agent string",
							example:
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
						},
						ipAddress: {
							type: "string",
							description: "IP address of the client",
							example: "192.168.1.100",
						},
						isActive: {
							type: "boolean",
							description:
								"Whether the session is currently active",
							example: true,
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description: "The date the session was created",
						},
						lastUsed: {
							type: "string",
							format: "date-time",
							description: "The date the session was last used",
						},
						expiresAt: {
							type: "string",
							format: "date-time",
							description: "The date the session expires",
						},
					},
				},
				AuthResponse: {
					type: "object",
					properties: {
						message: {
							type: "string",
							example: "Login successful",
						},
						token: {
							type: "string",
							description: "JWT token for authentication",
							example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
						},
						sessionId: {
							type: "string",
							description: "Session ID for the created session",
							example: "507f1f77bcf86cd799439015",
						},
						expiresAt: {
							type: "string",
							format: "date-time",
							description: "When the session expires",
						},
						user: {
							$ref: "#/components/schemas/User",
						},
					},
				},
				Error: {
					type: "object",
					properties: {
						message: {
							type: "string",
							description: "Error message",
							example: "An error occurred",
						},
					},
				},
			},
			responses: {
				NotFound: {
					description: "Resource not found",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
				InternalServerError: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
			},
		},
	},
	apis: ["./routes/*.ts", "./controllers/*.ts"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
	app.use(
		"/api-docs",
		swaggerUi.serve,
		swaggerUi.setup(specs, {
			explorer: true,
			customCss: ".swagger-ui .topbar { display: none }",
			customSiteTitle: "Chat App API Documentation",
		})
	);
};

export { specs };
