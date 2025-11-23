const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const Joi = require('joi');

const suggestSchema = Joi.object({
  capacity: Joi.number().min(1).required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  preferences: Joi.object({
    amenities: Joi.array().items(Joi.string()).optional()
  }).optional()
});

const createBookingSchema = Joi.object({
  roomId: Joi.string().uuid().required(),
  title: Joi.string().required(),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  attendees: Joi.number().min(1).required()
});

const feedbackSchema = Joi.object({
  roomId: Joi.string().uuid().required(),
  bookingId: Joi.string().uuid().optional(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().optional()
});

router.post('/suggest', authenticate, validateRequest(suggestSchema), bookingController.suggestRooms);
router.post('/', authenticate, validateRequest(createBookingSchema), bookingController.createBooking);
router.get('/my-bookings', authenticate, bookingController.getMyBookings);
router.put('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/feedback', authenticate, validateRequest(feedbackSchema), bookingController.submitFeedback);

module.exports = router;
