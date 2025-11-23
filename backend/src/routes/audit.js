const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/entity/:entityType/:entityId', authenticate, authorize(['admin', 'manager']), auditController.getEntityAuditTrail);
router.get('/user/:userId', authenticate, authorize(['admin']), auditController.getUserActivity);
router.get('/recent', authenticate, authorize(['admin']), auditController.getRecentActivity);

module.exports = router;
