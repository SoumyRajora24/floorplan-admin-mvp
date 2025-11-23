module.exports = (sequelize, DataTypes) => {
  const RoomFeedback = sequelize.define('RoomFeedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    bookingId: {
      type: DataTypes.UUID
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'room_feedback',
    timestamps: true
  });

  return RoomFeedback;
};
