const express = require('express');
const router = express.Router();
const floorPlanController = require('../controllers/floorPlanController');
const versionController = require('../controllers/versionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { parseFormData } = require('../middleware/parseFormData');
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload');
const Joi = require('joi');

const createFloorPlanSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  buildingName: Joi.string().optional().allow(''),
  floorNumber: Joi.number().optional(),
  initialData: Joi.object().optional()
});

const updateFloorPlanSchema = Joi.object({
  changes: Joi.object().required(),
  baseVersionId: Joi.string().uuid().optional(),
  changeSummary: Joi.string().optional()
});

// Floor plan routes
router.get('/', authenticate, floorPlanController.listFloorPlans);
// Serve floor plan images (fallback for local storage - must be before /:id route)
router.get('/images/:filename', floorPlanController.serveImage);
router.post('/', authenticate, authorize(['admin', 'manager']), upload.single('image'), uploadToCloudinary, parseFormData, validateRequest(createFloorPlanSchema), floorPlanController.createFloorPlan);
router.get('/:id', authenticate, floorPlanController.getFloorPlan);
router.put('/:id', authenticate, authorize(['admin', 'manager']), upload.single('image'), uploadToCloudinary, parseFormData, validateRequest(updateFloorPlanSchema), floorPlanController.updateFloorPlan);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), floorPlanController.deleteFloorPlan);
router.post('/:id/resolve-conflict', authenticate, authorize(['admin', 'manager']), floorPlanController.resolveConflictManually);

// Version routes
router.get('/:id/versions', authenticate, versionController.getVersionHistory);
router.get('/:id/versions/:versionId', authenticate, versionController.getVersion);
router.post('/:id/rollback/:versionId', authenticate, authorize(['admin']), versionController.rollback);
router.get('/:id/versions/compare/:version1/:version2', authenticate, versionController.compareVersions);

module.exports = router;
