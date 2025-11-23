const db = require('../models');
const { Op } = require('sequelize');
const versionControl = require('./versionControl');
const conflictResolution = require('./conflictResolution');
const auditLogger = require('./auditLogger');

class OfflineSyncService {
  async syncOfflineChanges(userId, queuedOperations) {
    const results = {
      applied: [],
      skipped: [],
      conflicts: []
    };

    for (const operation of queuedOperations) {
      try {
        const result = await this.processOperation(userId, operation);
        
        if (result.status === 'applied') {
          results.applied.push(result);
        } else if (result.status === 'conflict') {
          results.conflicts.push(result);
        } else {
          results.skipped.push(result);
        }

        // Audit log for sync operation
        await auditLogger.log({
          entityType: 'sync_operation',
          entityId: operation.id,
          action: 'offline_sync',
          userId,
          changes: operation,
          metadata: { result }
        });

      } catch (error) {
        results.skipped.push({
          operation,
          status: 'error',
          error: error.message
        });

        await auditLogger.log({
          entityType: 'sync_operation',
          entityId: operation.id,
          action: 'offline_sync_error',
          userId,
          metadata: { error: error.message, operation }
        });
      }
    }

    return results;
  }

  async processOperation(userId, operation) {
    const { type, floorPlanId, baseVersionId, changes, timestamp } = operation;

    switch (type) {
      case 'floor_plan_edit':
        return await this.syncFloorPlanEdit(userId, floorPlanId, baseVersionId, changes, timestamp);
      
      case 'booking_create':
        return await this.syncBookingCreate(userId, changes);
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  async syncFloorPlanEdit(userId, floorPlanId, baseVersionId, changes, timestamp) {
    // Check for conflicts
    const hasConflict = await conflictResolution.detectConflict(floorPlanId, baseVersionId);

    if (!hasConflict) {
      // No conflict, create new version
      const version = await versionControl.createVersion(
        floorPlanId,
        userId,
        changes,
        'Offline sync',
        baseVersionId
      );

      return {
        status: 'applied',
        operation: 'floor_plan_edit',
        versionId: version.id
      };
    }

    // Resolve conflict
    const resolution = await conflictResolution.resolveConflict(
      floorPlanId,
      baseVersionId,
      changes,
      userId
    );

    if (resolution.resolution === 'manual') {
      return {
        status: 'conflict',
        operation: 'floor_plan_edit',
        conflictData: resolution
      };
    }

    // Auto-resolved conflict
    const version = await versionControl.createVersion(
      floorPlanId,
      userId,
      resolution.mergedSnapshot,
      `Offline sync with ${resolution.resolution}`,
      baseVersionId
    );

    return {
      status: 'applied',
      operation: 'floor_plan_edit',
      versionId: version.id,
      conflictResolution: resolution.resolution
    };
  }

  async syncBookingCreate(userId, bookingData) {
    // Validate room still available
    const { roomId, startTime, endTime } = bookingData;
    
    const conflictingBooking = await db.Booking.findOne({
      where: {
        roomId,
        status: { [Op.ne]: 'cancelled' },
        [Op.or]: [
          { startTime: { [Op.between]: [startTime, endTime] } },
          { endTime: { [Op.between]: [startTime, endTime] } },
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gte]: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingBooking) {
      return {
        status: 'skipped',
        operation: 'booking_create',
        reason: 'Room no longer available',
        conflictingBookingId: conflictingBooking.id
      };
    }

    // Create booking
    const booking = await db.Booking.create({
      ...bookingData,
      userId,
      status: 'confirmed'
    });

    return {
      status: 'applied',
      operation: 'booking_create',
      bookingId: booking.id
    };
  }
}

module.exports = new OfflineSyncService();
