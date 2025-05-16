const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');

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

// Middleware
app.use(cors());
app.use(express.json());

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

// Protected routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', telegramAuth, require('./routes/users'));
app.use('/api/progress', telegramAuth, require('./routes/progress'));
app.use('/api/ads', telegramAuth, require('./routes/ads'));

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 