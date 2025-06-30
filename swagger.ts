import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Chat App API",
			version: "1.0.0",
			description:
				"A real-time chat application API built with Express, Socket.IO, and Prisma",
			contact: {
				name: "API Support",
				email: "support@chatapp.com",
			},
		},
		servers: [
			{
				url: "http://localhost:5000/api",
				description: "Development server",
			},
		],
		components: {
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
						},
						isPrivate: {
							type: "boolean",
							description: "Whether the room is private",
							example: false,
						},
						createdAt: {
							type: "string",
							format: "date-time",
							description: "The date the room was created",
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
