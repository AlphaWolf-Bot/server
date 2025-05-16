const socketIo = require('socket.io');
const UserLevel = require('../models/UserLevel');
const Achievement = require('../models/Achievement');
const telegramBotService = require('./telegramBot');

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map();
    this.initializeSocketHandlers();
  }

  initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New client connected');

      // Handle user authentication
      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.userId;
          this.userSockets.set(decoded.userId, socket);
          socket.join(`user_${decoded.userId}`);
          
          // Send initial user data
          await this.sendUserData(socket);
        } catch (error) {
          socket.disconnect();
        }
      });

      // Handle real-time progress updates
      socket.on('progress_update', async (data) => {
        if (socket.userId) {
          await this.handleProgressUpdate(socket.userId, data);
        }
      });

      // Handle achievement checks
      socket.on('check_achievements', async () => {
        if (socket.userId) {
          await this.checkAchievements(socket.userId);
        }
      });

      // Handle streak updates
      socket.on('update_streak', async () => {
        if (socket.userId) {
          await this.updateStreak(socket.userId);
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
        }
        console.log('Client disconnected');
      });
    });
  }

  async sendUserData(socket) {
    try {
      const userLevel = await UserLevel.findOne({ userId: socket.userId });
      if (userLevel) {
        socket.emit('user_data', {
          level: userLevel.level,
          experience: userLevel.experience,
          experienceToNextLevel: userLevel.experienceToNextLevel,
          streak: userLevel.streak,
          achievements: userLevel.achievements
        });
      }
    } catch (error) {
      console.error('Error sending user data:', error);
    }
  }

  async handleProgressUpdate(userId, data) {
    try {
      const userLevel = await UserLevel.findOne({ userId });
      if (!userLevel) return;

      const oldLevel = userLevel.level;
      await userLevel.addExperience(data.experience);
      await userLevel.updateStreak();

      // Emit progress update
      this.io.to(`user_${userId}`).emit('progress_updated', {
        level: userLevel.level,
        experience: userLevel.experience,
        experienceToNextLevel: userLevel.experienceToNextLevel,
        streak: userLevel.streak
      });

      // Check for level up
      if (userLevel.level > oldLevel) {
        this.io.to(`user_${userId}`).emit('level_up', {
          newLevel: userLevel.level
        });
        await this.checkAchievements(userId);
      }
    } catch (error) {
      console.error('Error handling progress update:', error);
    }
  }

  async checkAchievements(userId) {
    try {
      const userLevel = await UserLevel.findOne({ userId });
      if (!userLevel) return;

      const achievements = await Achievement.find();
      const newAchievements = [];

      for (const achievement of achievements) {
        const hasAchievement = userLevel.achievements.some(
          a => a.name === achievement.name
        );

        if (!hasAchievement) {
          let unlocked = false;

          switch (achievement.type) {
            case 'level':
              unlocked = userLevel.level >= achievement.requirement;
              break;
            case 'streak':
              unlocked = userLevel.streak >= achievement.requirement;
              break;
            case 'experience':
              unlocked = userLevel.experience >= achievement.requirement;
              break;
          }

          if (unlocked) {
            userLevel.achievements.push({
              name: achievement.name,
              description: achievement.description,
              unlockedAt: new Date()
            });
            newAchievements.push(achievement);
          }
        }
      }

      if (newAchievements.length > 0) {
        await userLevel.save();
        this.io.to(`user_${userId}`).emit('achievements_unlocked', newAchievements);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  async updateStreak(userId) {
    try {
      const userLevel = await UserLevel.findOne({ userId });
      if (!userLevel) return;

      await userLevel.updateStreak();
      this.io.to(`user_${userId}`).emit('streak_updated', {
        streak: userLevel.streak
      });

      await this.checkAchievements(userId);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }

  // Broadcast to all connected users
  broadcast(message, data) {
    this.io.emit(message, data);
  }

  // Send to specific user
  sendToUser(userId, message, data) {
    this.io.to(`user_${userId}`).emit(message, data);
  }
}

module.exports = RealtimeService; 