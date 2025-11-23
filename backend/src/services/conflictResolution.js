const db = require('../models');

class ConflictResolutionService {
  async detectConflict(floorPlanId, baseVersionId) {
    const currentVersion = await db.FloorPlan.findByPk(floorPlanId, {
      attributes: ['currentVersionId']
    });

    if (!currentVersion) {
      throw new Error('Floor plan not found');
    }

    return currentVersion.currentVersionId !== baseVersionId;
  }

  async resolveConflict(floorPlanId, baseVersionId, newChanges, authorId) {
    // Get current floor plan first
    const currentFloorPlan = await db.FloorPlan.findByPk(floorPlanId);
    
    if (!currentFloorPlan) {
      throw new Error('Floor plan not found');
    }

    if (!currentFloorPlan.currentVersionId) {
      throw new Error('Floor plan has no current version');
    }

    // Get current version and base version
    const [baseVersion, currentVersion] = await Promise.all([
      db.FloorPlanVersion.findByPk(baseVersionId),
      db.FloorPlanVersion.findOne({
        where: { id: currentFloorPlan.currentVersionId },
        include: [{ model: db.User, as: 'author' }]
      })
    ]);

    if (!baseVersion) {
      throw new Error('Base version not found');
    }

    if (!currentVersion) {
      throw new Error('Current version not found');
    }

    // Get author details
    const newAuthor = await db.User.findByPk(authorId);

    const conflictResult = {
      hasConflict: true,
      resolution: null,
      conflictingEntities: [],
      mergedSnapshot: null
    };

    // Detect entity-level conflicts
    const entityConflicts = this.findEntityConflicts(
      baseVersion.snapshot,
      currentVersion.snapshot,
      newChanges
    );

    if (entityConflicts.length === 0) {
      // No conflicts, merge automatically
      conflictResult.resolution = 'auto-merge';
      conflictResult.mergedSnapshot = this.autoMerge(
        currentVersion.snapshot,
        newChanges
      );
    } else {
      // Resolve conflicts using priority rules
      const resolvedConflicts = entityConflicts.map(conflict => {
        return this.resolveEntityConflict(
          conflict,
          newAuthor,
          currentVersion.author,
          newChanges,
          currentVersion.snapshot
        );
      });

      // Check if manual resolution needed
      const needsManual = resolvedConflicts.some(r => r.resolution === 'manual');

      if (needsManual) {
        conflictResult.resolution = 'manual';
        conflictResult.conflictingEntities = resolvedConflicts;
      } else {
        conflictResult.resolution = 'auto-resolved';
        conflictResult.mergedSnapshot = this.applyResolvedConflicts(
          currentVersion.snapshot,
          newChanges,
          resolvedConflicts
        );
      }
    }

    return conflictResult;
  }

  findEntityConflicts(baseSnapshot, currentSnapshot, newChanges) {
    const conflicts = [];

    // Compare rooms
    const baseRooms = this.normalizeEntities(baseSnapshot.rooms || []);
    const currentRooms = this.normalizeEntities(currentSnapshot.rooms || []);
    const newRooms = this.normalizeEntities(newChanges.rooms || []);

    Object.keys(newRooms).forEach(roomId => {
      if (baseRooms[roomId] && currentRooms[roomId]) {
        const baseStr = JSON.stringify(baseRooms[roomId]);
        const currentStr = JSON.stringify(currentRooms[roomId]);
        const newStr = JSON.stringify(newRooms[roomId]);

        if (baseStr !== currentStr && baseStr !== newStr) {
          conflicts.push({
            entityType: 'room',
            entityId: roomId,
            baseVersion: baseRooms[roomId],
            currentVersion: currentRooms[roomId],
            newVersion: newRooms[roomId]
          });
        }
      }
    });

    return conflicts;
  }

  normalizeEntities(entities) {
    return entities.reduce((acc, entity) => {
      acc[entity.id] = entity;
      return acc;
    }, {});
  }

  resolveEntityConflict(conflict, newAuthor, currentAuthor, newChanges, currentSnapshot) {
    const roleHierarchy = { admin: 3, manager: 2, user: 1 };
    const newRole = roleHierarchy[newAuthor.role] || 0;
    const currentRole = roleHierarchy[currentAuthor.role] || 0;

    let resolution = {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      resolution: null,
      winner: null,
      loser: null
    };

    // Role-based priority
    if (newRole > currentRole) {
      resolution.resolution = 'role-priority';
      resolution.winner = 'new';
      resolution.acceptedVersion = conflict.newVersion;
      resolution.overriddenVersion = conflict.currentVersion;
    } else if (currentRole > newRole) {
      resolution.resolution = 'role-priority';
      resolution.winner = 'current';
      resolution.acceptedVersion = conflict.currentVersion;
      resolution.overriddenVersion = conflict.newVersion;
    } else {
      // Timestamp priority (earlier wins)
      const newTimestamp = newChanges.timestamp || Date.now();
      const currentTimestamp = currentSnapshot.timestamp || Date.now();

      if (newTimestamp < currentTimestamp) {
        resolution.resolution = 'timestamp-priority';
        resolution.winner = 'new';
        resolution.acceptedVersion = conflict.newVersion;
        resolution.overriddenVersion = conflict.currentVersion;
      } else if (currentTimestamp < newTimestamp) {
        resolution.resolution = 'timestamp-priority';
        resolution.winner = 'current';
        resolution.acceptedVersion = conflict.currentVersion;
        resolution.overriddenVersion = conflict.newVersion;
      } else {
        // Equal priority - needs manual resolution
        resolution.resolution = 'manual';
        resolution.options = [conflict.currentVersion, conflict.newVersion];
      }
    }

    return resolution;
  }

  autoMerge(currentSnapshot, newChanges) {
    const merged = JSON.parse(JSON.stringify(currentSnapshot));

    // Merge rooms
    if (newChanges.rooms) {
      const currentRoomsMap = this.normalizeEntities(merged.rooms || []);
      newChanges.rooms.forEach(room => {
        currentRoomsMap[room.id] = room;
      });
      merged.rooms = Object.values(currentRoomsMap);
    }

    // Merge other entities similarly...
    return merged;
  }

  applyResolvedConflicts(currentSnapshot, newChanges, resolvedConflicts) {
    let merged = this.autoMerge(currentSnapshot, newChanges);

    resolvedConflicts.forEach(resolution => {
      if (resolution.winner === 'current') {
        // Keep current version (already in merged)
      } else if (resolution.winner === 'new') {
        // Apply new version
        const entities = merged[resolution.entityType + 's'] || [];
        const index = entities.findIndex(e => e.id === resolution.entityId);
        if (index >= 0) {
          entities[index] = resolution.acceptedVersion;
        }
      }
    });

    return merged;
  }
}

module.exports = new ConflictResolutionService();
