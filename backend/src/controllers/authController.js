const db = require('../models');
const jwt = require('jsonwebtoken');
const auditLogger = require('../services/auditLogger');

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role, teamId } = req.body;

    // Check if user exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await db.User.create({
      email,
      password,
      name,
      role: role || 'user',
      teamId
    });

    await auditLogger.log({
      entityType: 'user',
      entityId: user.id,
      action: 'register',
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db.User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    await auditLogger.log({
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the event
    if (req.user) {
      await auditLogger.log({
        entityType: 'user',
        entityId: req.user.id,
        action: 'logout',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
