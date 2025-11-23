require('dotenv').config();
const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const db = require('./models');
const routes = require('./routes');
const socketHandler = require('./sockets');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const cache = require('./utils/cache');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files - serve at both /uploads and /api/uploads for compatibility
const staticOptions = {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
};

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), staticOptions));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads'), staticOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize socket handlers
socketHandler(io);

// Database connection and server start
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('Database connection established');

    // Sync database (use migrations in production)
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: false });
      logger.info('Database synchronized');
    }

    // Connect to Redis cache
    await cache.connect();

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(async () => {
    await db.sequelize.close();
    if (cache.client) {
      await cache.client.quit();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };
