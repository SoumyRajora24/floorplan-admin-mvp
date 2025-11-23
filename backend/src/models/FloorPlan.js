module.exports = (sequelize, DataTypes) => {
  const FloorPlan = sequelize.define('FloorPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    buildingName: {
      type: DataTypes.STRING
    },
    floorNumber: {
      type: DataTypes.INTEGER
    },
    currentVersionId: {
      type: DataTypes.UUID
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL or path to the floor plan image file'
    }
  }, {
    tableName: 'floor_plans',
    timestamps: true
  });

  return FloorPlan;
};
