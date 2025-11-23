  module.exports = (sequelize, DataTypes) => {
  const MeetingRoom = sequelize.define('MeetingRoom', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    floorPlanId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    position: {
      type: DataTypes.JSONB,
      comment: 'x, y coordinates on floor plan'
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    bookingScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Aggregated score based on usage and feedback'
    }
  }, {
    tableName: 'meeting_rooms',
    timestamps: true
  });

  return MeetingRoom;
};
