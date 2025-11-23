const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/floorplans', require('./floorplan'));
router.use('/bookings', require('./bookings'));
router.use('/audit', require('./audit'));
router.use('/sync', require('./sync'));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
