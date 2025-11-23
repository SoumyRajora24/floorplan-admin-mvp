const auditLogger = require('../services/auditLogger');

exports.getEntityAuditTrail = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const logs = await auditLogger.getAuditTrail(entityType, entityId, limit);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const logs = await auditLogger.getUserActivity(userId, limit);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const db = require('../models');

    const logs = await db.AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
