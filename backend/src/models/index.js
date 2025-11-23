const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.FloorPlan = require('./FloorPlan')(sequelize, Sequelize);
db.FloorPlanVersion = require('./FloorPlanVersion')(sequelize, Sequelize);
db.MeetingRoom = require('./MeetingRoom')(sequelize, Sequelize);
db.Booking = require('./Booking')(sequelize, Sequelize);
db.AuditLog = require('./AuditLog')(sequelize, Sequelize);
db.RoomFeedback = require('./RoomFeedback')(sequelize, Sequelize);

// Associations
db.FloorPlan.hasMany(db.FloorPlanVersion, { foreignKey: 'floorPlanId' });
db.FloorPlanVersion.belongsTo(db.FloorPlan, { foreignKey: 'floorPlanId' });
db.FloorPlanVersion.belongsTo(db.User, { foreignKey: 'authorId', as: 'author' });

db.FloorPlan.hasMany(db.MeetingRoom, { foreignKey: 'floorPlanId' });
db.MeetingRoom.belongsTo(db.FloorPlan, { foreignKey: 'floorPlanId' });

db.MeetingRoom.hasMany(db.Booking, { foreignKey: 'roomId' });
db.Booking.belongsTo(db.MeetingRoom, { foreignKey: 'roomId' });
db.Booking.belongsTo(db.User, { foreignKey: 'userId' });

db.MeetingRoom.hasMany(db.RoomFeedback, { foreignKey: 'roomId' });
db.RoomFeedback.belongsTo(db.MeetingRoom, { foreignKey: 'roomId' });
db.RoomFeedback.belongsTo(db.User, { foreignKey: 'userId' });

module.exports = db;
