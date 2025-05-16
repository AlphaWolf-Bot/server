const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const os = require('os');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize services
const RealtimeService = require('./services/realtimeService');
const telegramBotService = require('./services/telegramBot');
const adService = require('./services/adService');
const realtimeService = new RealtimeService(io);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alpha Wulf API',
      version: '1.0.0',
      description: 'API documentation for Alpha Wulf application',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Root route handler
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Alpha Wulf API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api-docs'
  });
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    system: {
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg()
      },
      platform: os.platform(),
      uptime: os.uptime()
    },
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      supabase: supabase ? 'connected' : 'disconnected',
      telegram: telegramBotService ? 'initialized' : 'not initialized'
    }
  };
  res.json(healthData);
});

// Telegram Web App Authentication Middleware
const telegramAuth = async (req, res, next) => {
  try {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
      return res.status(401).json({ error: 'No Telegram data provided' });
    }

    // Verify Telegram Web App data
    const { user } = await telegramBotService.verifyTelegramData(initData);
    if (!user) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    // Get or create user in Supabase
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    let userId;
    if (!existingUser) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          balance: 0,
          level: 'Alpha Pup',
          level_points: 0
        }])
        .select()
        .single();

      if (createError) throw createError;
      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, telegramId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    req.user = { id: userId, telegramId: user.id };
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// API Routes with rate limiting
app.use('/api/auth', limiter, require('./routes/auth'));
app.use('/api/users', limiter, telegramAuth, require('./routes/users'));
app.use('/api/progress', limiter, telegramAuth, require('./routes/progress'));
app.use('/api/ads', limiter, telegramAuth, require('./routes/ads'));

// Enhanced error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token or no token provided'
    });
  }

  if (err.name === 'RateLimitExceeded') {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

app.use(errorHandler);

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  console.log(`API Documentation at http://localhost:${PORT}/api-docs`);
}); 