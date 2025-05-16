# Backend Server

This is the backend server for the application, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/your_database
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### User Management
- GET `/api/users/profile` - Get user profile
- PUT `/api/users/profile` - Update user profile
- DELETE `/api/users/profile` - Delete user account

## Features

- User authentication with JWT
- Real-time updates with Socket.IO
- MongoDB database integration
- RESTful API endpoints
- Secure password hashing
- CORS enabled
- Error handling middleware

## Development

The server uses nodemon for development, which automatically restarts when changes are detected.

## Production

For production deployment:
1. Set NODE_ENV to production
2. Use a proper MongoDB instance
3. Set up proper security measures
4. Use environment variables for sensitive data

## Security

- Passwords are hashed using bcrypt
- JWT for authentication
- CORS protection
- Input validation
- Error handling 