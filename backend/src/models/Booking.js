module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    attendees: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      defaultValue: 'pending'
    },
    suggestionReason: {
      type: DataTypes.JSONB,
      comment: 'Why this room was suggested/selected'
    }
  }, {
    tableName: 'bookings',
    timestamps: true,
    indexes: [
      {
        fields: ['roomId', 'startTime', 'endTime']
      }
    ]
  });

  return Booking;
};
