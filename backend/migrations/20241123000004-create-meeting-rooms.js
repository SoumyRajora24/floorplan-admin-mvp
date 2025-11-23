'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('meeting_rooms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      floorPlanId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'floor_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      position: {
        type: Sequelize.JSONB
      },
      amenities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      bookingScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('meeting_rooms', ['floorPlanId']);
    await queryInterface.addIndex('meeting_rooms', ['capacity']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('meeting_rooms');
  }
};
