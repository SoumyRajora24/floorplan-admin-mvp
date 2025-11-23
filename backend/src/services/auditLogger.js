const db = require('../models');

class AuditLoggerService {
  async log(params) {
    const {
      entityType,
      entityId,
      action,
      userId,
      changes = null,
      metadata = null,
      ipAddress = null,
      userAgent = null
    } = params;

    try {
      return await db.AuditLog.create({
        entityType,
        entityId,
        action,
        userId,
        changes,
        metadata,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failure shouldn't break operations
    }
  }

  async getAuditTrail(entityType, entityId, limit = 100) {
    return await db.AuditLog.findAll({
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async getUserActivity(userId, limit = 100) {
    return await db.AuditLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

module.exports = new AuditLoggerService();
