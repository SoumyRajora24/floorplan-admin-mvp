const db = require('../models');
const { sequelize } = db;

class VersionControlService {
  async createVersion(floorPlanId, authorId, snapshot, changeSummary, baseVersionId = null) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get current version number
      const lastVersion = await db.FloorPlanVersion.findOne({
        where: { floorPlanId },
        order: [['versionNumber', 'DESC']],
        transaction
      });

      const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

      // Calculate diff if there's a previous version
      let diff = null;
      if (lastVersion) {
        diff = this.calculateDiff(lastVersion.snapshot, snapshot);
      }

      // Create new version
      const version = await db.FloorPlanVersion.create({
        floorPlanId,
        versionNumber,
        authorId,
        changeSummary,
        changeType: versionNumber === 1 ? 'create' : 'update',
        snapshot,
        diff,
        baseVersionId
      }, { transaction });

      // Update floor plan's current version
      await db.FloorPlan.update(
        { currentVersionId: version.id },
        { where: { id: floorPlanId }, transaction }
      );

      await transaction.commit();
      return version;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  calculateDiff(oldSnapshot, newSnapshot) {
    const diff = {
      added: {},
      modified: {},
      removed: {}
    };

    // Rooms diff
    const oldRooms = oldSnapshot.rooms || [];
    const newRooms = newSnapshot.rooms || [];
    
    const oldRoomIds = new Set(oldRooms.map(r => r.id));
    const newRoomIds = new Set(newRooms.map(r => r.id));

    newRooms.forEach(room => {
      if (!oldRoomIds.has(room.id)) {
        diff.added.rooms = diff.added.rooms || [];
        diff.added.rooms.push(room);
      } else {
        const oldRoom = oldRooms.find(r => r.id === room.id);
        if (JSON.stringify(oldRoom) !== JSON.stringify(room)) {
          diff.modified.rooms = diff.modified.rooms || [];
          diff.modified.rooms.push({ old: oldRoom, new: room });
        }
      }
    });

    oldRooms.forEach(room => {
      if (!newRoomIds.has(room.id)) {
        diff.removed.rooms = diff.removed.rooms || [];
        diff.removed.rooms.push(room);
      }
    });

    return diff;
  }

  async getVersionHistory(floorPlanId, limit = 50) {
    return await db.FloorPlanVersion.findAll({
      where: { floorPlanId },
      include: [{ model: db.User, as: 'author', attributes: ['id', 'name', 'email'] }],
      order: [['versionNumber', 'DESC']],
      limit
    });
  }

  async rollback(floorPlanId, targetVersionId, authorId) {
    const targetVersion = await db.FloorPlanVersion.findByPk(targetVersionId);
    if (!targetVersion || targetVersion.floorPlanId !== floorPlanId) {
      throw new Error('Invalid version for rollback');
    }

    return await this.createVersion(
      floorPlanId,
      authorId,
      targetVersion.snapshot,
      `Rolled back to version ${targetVersion.versionNumber}`,
      targetVersionId
    );
  }
}

module.exports = new VersionControlService();
