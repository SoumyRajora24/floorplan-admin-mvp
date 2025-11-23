module.exports = (sequelize, DataTypes) => {
  const FloorPlanVersion = sequelize.define('FloorPlanVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    floorPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'floor_plans',
        key: 'id'
      }
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    changeSummary: {
      type: DataTypes.TEXT
    },
    changeType: {
      type: DataTypes.ENUM('create', 'update', 'rollback', 'merge'),
      defaultValue: 'update'
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Complete floor plan state including rooms, seats, zones'
    },
    diff: {
      type: DataTypes.JSONB,
      comment: 'Delta changes from previous version'
    },
    baseVersionId: {
      type: DataTypes.UUID,
      comment: 'Version this edit was based on (for conflict detection)'
    },
    conflictResolution: {
      type: DataTypes.JSONB,
      comment: 'Details of any conflict resolution applied'
    }
  }, {
    tableName: 'floor_plan_versions',
    timestamps: true,
    indexes: [
      {
        fields: ['floorPlanId', 'versionNumber'],
        unique: true
      }
    ]
  });

  return FloorPlanVersion;
};
