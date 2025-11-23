'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('floor_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      buildingName: {
        type: Sequelize.STRING
      },
      floorNumber: {
        type: Sequelize.INTEGER
      },
      currentVersionId: {
        type: Sequelize.UUID
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    await queryInterface.addIndex('floor_plans', ['buildingName', 'floorNumber']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('floor_plans');
  }
};
