import "dotenv/config";
import mongoose from "mongoose";

async function testConnection() {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		console.log("❌ DATABASE_URL not found in environment variables");
		return;
	}

	console.log("🔗 Testing MongoDB connection with Mongoose...");
	console.log(
		"Connection string:",
		connectionString.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
	);

	try {
		await mongoose.connect(connectionString);

		console.log("✅ MongoDB connection successful!");
		console.log("Connection state:", mongoose.connection.readyState);
		console.log("Database name:", mongoose.connection.name);

		// Test the connection with a simple query
		if (mongoose.connection.db) {
			const collections = await mongoose.connection.db
				.listCollections()
				.toArray();
			console.log(
				"📚 Available collections:",
				collections.map((col) => col.name)
			);
		}

		await mongoose.disconnect();
		console.log("🔌 Connection closed");
	} catch (error) {
		console.log("❌ MongoDB connection failed:");
		console.error(error instanceof Error ? error.message : error);

		if (
			error instanceof Error &&
			error.message.includes("authentication")
		) {
			console.log("💡 Authentication failed. Please check:");
			console.log("   - Username and password are correct");
			console.log("   - User has proper permissions");
			console.log("   - authSource parameter is correct");
		}
	}
}

testConnection();
