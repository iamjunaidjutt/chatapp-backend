# Chat App Backend 💬

A real-time chat application backend built with Express, Socket.IO, and MongoDB. Features hybrid JWT + session authentication, real-time messaging, user presence tracking, and comprehensive API documentation.

![API Documentation](./public/Chat-App-API-Documentation.png)

## 🚀 Features

### Core Functionality
- **Real-time Messaging** - Send and receive messages instantly using Socket.IO
- **Room-based Chat** - Create and join chat rooms with participant management
- **User Authentication** - Secure hybrid JWT + MongoDB session authentication
- **User Presence** - Track online/offline status and typing indicators
- **Message Management** - Edit, delete, and search messages with full history
- **Role-based Access** - User and admin roles with appropriate permissions

### Socket.IO Features
- **Real-time Events** - Message broadcasting, typing indicators, presence updates
- **Room Management** - Join/leave rooms with participant tracking
- **Typing Indicators** - Real-time typing notifications with auto-timeout
- **User Presence** - Online/offline status with room-based notifications
- **Error Handling** - Comprehensive error handling and graceful degradation

### API Features
- **RESTful API** - Complete REST API for all chat operations
- **Swagger Documentation** - Interactive API documentation at `/api-docs`
- **Input Validation** - Comprehensive request validation and error handling
- **Pagination Support** - Efficient pagination for messages and rooms
- **Search Functionality** - Full-text search across messages

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for WebSocket communication
- **Authentication**: JWT tokens with MongoDB sessions
- **Documentation**: Swagger UI with automatic API docs
- **Development**: Nodemon for hot reloading

## 📦 Dependencies

### Core Dependencies
```json
{
  "express": "^5.1.0",           // Web framework
  "socket.io": "^4.8.1",        // Real-time communication
  "mongoose": "^8.16.1",        // MongoDB ODM
  "jsonwebtoken": "^9.0.2",     // JWT authentication
  "bcryptjs": "^3.0.2",         // Password hashing
  "cors": "^2.8.5",             // Cross-origin resource sharing
  "dotenv": "^17.0.0",          // Environment variables
  "moment": "^2.30.1",          // Date manipulation
  "swagger-jsdoc": "^6.2.8",    // API documentation
  "swagger-ui-express": "^5.0.1" // Swagger UI
}
```

## 🗄️ Database Models

### User Model
- `username` - Unique username
- `email` - User email address
- `password` - Hashed password
- `role` - User role (user/admin)
- `avatarUrl` - Profile picture URL
- `isOnline` - Online status

### Room Model
- `name` - Room name (optional for private rooms)
- `description` - Room description
- `isPrivate` - Privacy setting
- `maxParticipants` - Maximum participants limit
- `createdBy` - Room creator reference

### Message Model
- `content` - Message content
- `userId` - Message author reference
- `roomId` - Room reference
- `messageType` - Type (text/image/file)
- `isEdited` - Edit status
- `editedAt` - Edit timestamp

### UserRoom Model
- `userId` - User reference
- `roomId` - Room reference
- `role` - User role in room (member/admin/moderator)
- `joinedAt` - Join timestamp
- `isActive` - Active status

### Session Model
- `userId` - User reference
- `tokenHash` - Hashed JWT token
- `userAgent` - Client information
- `ipAddress` - Client IP
- `expiresAt` - Session expiration

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (v5.0+ recommended)
- pnpm (recommended) or npm

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/chatapp

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=8000
CLIENT_URL=http://localhost:3000

# Development (optional)
NODE_ENV=development
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or start your local MongoDB service
   sudo service mongod start
   ```

5. **Run the application**
   ```bash
   # Development mode with hot reloading
   pnpm run dev
   
   # Production mode
   pnpm run build
   pnpm start
   ```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh authentication

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Messages
- `GET /api/rooms/:id/messages` - Get room messages
- `POST /api/rooms/:id/messages` - Send message
- `GET /api/messages/:id` - Get specific message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `GET /api/messages/search` - Search messages

### User-Room Management
- `GET /api/user-rooms` - Get user's rooms
- `POST /api/user-rooms/join` - Join room
- `DELETE /api/user-rooms/:id` - Leave room
- `GET /api/rooms/:id/participants` - Get room participants

### Socket Operations
- `GET /api/socket/rooms/:id/active-users` - Get active users in room
- `GET /api/socket/rooms/:id/typing-users` - Get typing users
- `GET /api/socket/stats` - Socket server statistics (admin)
- `POST /api/socket/send-message` - Send direct message (admin)

### Sessions
- `GET /api/sessions` - Get user sessions
- `DELETE /api/sessions/:id` - Revoke session

## 🔌 Socket.IO Events

### Client → Server Events
```javascript
// Room management
socket.emit('joinRoom', { roomId: 'room-id' });
socket.emit('leaveRoom', { roomId: 'room-id' });

// Typing indicators
socket.emit('startTyping', { roomId: 'room-id' });
socket.emit('stopTyping', { roomId: 'room-id' });

// Presence updates
socket.emit('updatePresence', { status: 'online' | 'away' | 'offline' });
```

### Server → Client Events
```javascript
// Message events
socket.on('newMessage', (messageData) => { /* Handle new message */ });
socket.on('messageUpdated', (messageData) => { /* Handle message edit */ });
socket.on('messageDeleted', ({ messageId, roomId }) => { /* Handle deletion */ });

// Room events
socket.on('userJoinedRoom', (membershipData) => { /* User joined */ });
socket.on('userLeftRoom', (membershipData) => { /* User left */ });

// Presence events
socket.on('userOnline', (presenceData) => { /* User came online */ });
socket.on('userOffline', (presenceData) => { /* User went offline */ });

// Typing events
socket.on('userTyping', (typingData) => { /* Show typing indicator */ });
socket.on('userStoppedTyping', (typingData) => { /* Hide typing indicator */ });

// Error handling
socket.on('error', ({ message, code }) => { /* Handle errors */ });
```

## 📚 API Documentation

The API documentation is automatically generated using Swagger and available at:
- **Local Development**: http://localhost:8000/api-docs
- **Production**: https://your-domain.com/api-docs

The documentation includes:
- Interactive API explorer
- Request/response examples
- Authentication requirements
- Model schemas
- Error response formats

## 🔒 Authentication

### Hybrid Authentication System
The application uses a hybrid JWT + MongoDB session system:

1. **JWT Tokens**: Used for stateless authentication
2. **Database Sessions**: Track active sessions for security
3. **Token Validation**: Both JWT and session must be valid
4. **Session Management**: Users can view and revoke active sessions

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **JWT Security**: Signed tokens with configurable expiration
- **Session Tracking**: IP address and user agent logging
- **Auto Cleanup**: Expired sessions automatically removed
- **Role-based Access**: User and admin roles

## 🧪 Development

### Available Scripts
```bash
# Development with hot reloading
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Linting
pnpm run lint

# Code formatting
pnpm run format
pnpm run prettier:fix

# Clean build files
pnpm run clean
pnpm run clean:all
```

### Project Structure
```
backend/
├── controllers/          # Route controllers
│   ├── auth.controllers.ts
│   ├── message.controllers.ts
│   ├── room.controllers.ts
│   ├── socket.controllers.ts
│   └── user.controllers.ts
├── middlewares/          # Express middlewares
│   ├── error-handler.middlewares.ts
│   ├── hybrid-auth.middlewares.ts
│   ├── logger.middlewares.ts
│   └── socket-auth.middlewares.ts
├── models/              # Mongoose models
│   ├── index.ts
│   ├── message.models.ts
│   ├── room.models.ts
│   ├── session.models.ts
│   ├── user-room.models.ts
│   └── user.models.ts
├── routes/              # Express routes
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── message.routes.ts
│   ├── room.routes.ts
│   ├── socket.routes.ts
│   └── user.routes.ts
├── types/               # TypeScript definitions
│   └── socket.types.ts
├── utils/               # Utility functions
│   ├── socket.service.ts
│   ├── socket.instance.ts
│   └── socket.utils.ts
├── public/              # Static files
│   └── Chat-App-API-Documentation.png
├── config.ts            # App configuration
├── index.ts             # Application entry point
├── swagger.ts           # Swagger configuration
└── README.md           # This file
```

## 🔧 Configuration

### Environment Configuration
The application supports various configuration options through environment variables:

- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `PORT`: Server port (default: 5000)
- `CLIENT_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV`: Environment mode (development/production)

### Database Configuration
MongoDB connection options can be configured in the connection string:
```
DATABASE_URL=mongodb://username:password@host:port/database?options
```

## 🚀 Production Deployment

### Build and Deploy
```bash
# Build the application
pnpm run build

# Start in production mode
NODE_ENV=production pnpm start
```

### Production Considerations
1. **Environment Variables**: Set all required environment variables
2. **Database**: Use MongoDB Atlas or a production MongoDB instance
3. **Security**: Use strong JWT secrets and enable HTTPS
4. **Monitoring**: Implement logging and monitoring solutions
5. **Scaling**: Consider using PM2 for process management
6. **CORS**: Configure appropriate CORS origins for production

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests if applicable
4. Run linting and formatting: `pnpm run lint && pnpm run format`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to your branch: `git push origin feature-name`
7. Create a Pull Request

## 📄 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 📞 Support

For support or questions:
- Create an issue in the GitHub repository
- Check the API documentation at `/api-docs`

---

**Built with ❤️ using Node.js, Express, Socket.IO, and MongoDB**
