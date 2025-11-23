const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const Joi = require('joi');

const syncSchema = Joi.object({
  operations: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('floor_plan_edit', 'booking_create').required(),
      timestamp: Joi.date().iso().required(),
      floorPlanId: Joi.string().uuid().optional(),
      baseVersionId: Joi.string().uuid().optional(),
      changes: Joi.object().optional(),
      roomId: Joi.string().uuid().optional(),
      title: Joi.string().optional(),
      startTime: Joi.date().iso().optional(),
      endTime: Joi.date().iso().optional(),
      attendees: Joi.number().optional()
    })
  ).required()
});

router.post('/offline', authenticate, validateRequest(syncSchema), syncController.syncOfflineChanges);

module.exports = router;
