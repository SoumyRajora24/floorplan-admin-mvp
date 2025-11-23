'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('floor_plans', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL or path to the floor plan image file'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('floor_plans', 'imageUrl');
  }
};

