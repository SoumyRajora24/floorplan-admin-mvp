const jwt = require('jsonwebtoken');
const db = require('../models');
const logger = require('../utils/logger');

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db.User.findByPk(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Invalid token'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.email} (${socket.id})`);

    // Join floor plan room
    socket.on('joinFloorPlan', (floorPlanId) => {
      socket.join(`floorplan:${floorPlanId}`);
      logger.info(`User ${socket.user.email} joined floor plan ${floorPlanId}`);
    });

    // Leave floor plan room
    socket.on('leaveFloorPlan', (floorPlanId) => {
      socket.leave(`floorplan:${floorPlanId}`);
      logger.info(`User ${socket.user.email} left floor plan ${floorPlanId}`);
    });

    // Broadcast editing activity (cursor position, selection, etc.)
    socket.on('editActivity', (data) => {
      socket.to(`floorplan:${data.floorPlanId}`).emit('userEditActivity', {
        userId: socket.user.id,
        userName: socket.user.name,
        ...data
      });
    });

    // Notify about version conflicts in real-time
    socket.on('conflictDetected', (data) => {
      socket.to(`floorplan:${data.floorPlanId}`).emit('conflictNotification', {
        floorPlanId: data.floorPlanId,
        userId: socket.user.id,
        userName: socket.user.name,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.email} (${socket.id})`);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Periodic connection status broadcast
  setInterval(() => {
    const connectedUsers = Array.from(io.sockets.sockets.values()).map(s => ({
      userId: s.user.id,
      userName: s.user.name
    }));

    io.emit('connectedUsers', connectedUsers);
  }, 30000); // Every 30 seconds
};
