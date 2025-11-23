'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('floor_plan_versions', {
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
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      authorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      changeSummary: {
        type: Sequelize.TEXT
      },
      changeType: {
        type: Sequelize.ENUM('create', 'update', 'rollback', 'merge'),
        defaultValue: 'update'
      },
      snapshot: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      diff: {
        type: Sequelize.JSONB
      },
      baseVersionId: {
        type: Sequelize.UUID
      },
      conflictResolution: {
        type: Sequelize.JSONB
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

    await queryInterface.addIndex('floor_plan_versions', ['floorPlanId', 'versionNumber'], {
      unique: true
    });
    await queryInterface.addIndex('floor_plan_versions', ['authorId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('floor_plan_versions');
  }
};
