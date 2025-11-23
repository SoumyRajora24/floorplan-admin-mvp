const db = require('../models');
const roomSuggestion = require('../services/roomSuggestions');
const auditLogger = require('../services/auditLogger');
const { Op } = require('sequelize');

exports.suggestRooms = async (req, res, next) => {
  try {
    const { capacity, startTime, endTime, preferences, referencePosition } = req.body;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const suggestions = await roomSuggestion.suggestRooms({
      capacity,
      startTime,
      endTime,
      userId,
      teamId,
      preferences,
      referencePosition
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { roomId, title, startTime, endTime, attendees } = req.body;
    const userId = req.user.id;

    // Re-validate room availability
    const conflictingBooking = await db.Booking.findOne({
      where: {
        roomId,
        status: { [Op.ne]: 'cancelled' },
        [Op.or]: [
          { startTime: { [Op.between]: [startTime, endTime] } },
          { endTime: { [Op.between]: [startTime, endTime] } },
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gte]: endTime } }
            ]
          }
        ]
      },
      transaction
    });

    if (conflictingBooking) {
      await transaction.rollback();

      // Suggest alternatives
      const alternatives = await roomSuggestion.suggestRooms({
        capacity: attendees,
        startTime,
        endTime,
        userId,
        teamId: req.user.teamId
      });

      return res.status(409).json({
        success: false,
        message: 'Room no longer available',
        alternatives: alternatives.slice(0, 3)
      });
    }

    // Create booking
    const booking = await db.Booking.create({
      roomId,
      userId,
      title,
      startTime,
      endTime,
      attendees,
      status: 'confirmed'
    }, { transaction });

    await transaction.commit();

    await auditLogger.log({
      entityType: 'booking',
      entityId: booking.id,
      action: 'create',
      userId,
      changes: booking,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Emit socket event
    req.io.emit('bookingCreated', { booking });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.submitFeedback = async (req, res, next) => {
  try {
    const { roomId, bookingId, rating, comment } = req.body;
    const userId = req.user.id;

    const feedback = await db.RoomFeedback.create({
      roomId,
      userId,
      bookingId,
      rating,
      comment
    });

    // Update room score
    const avgRating = await db.RoomFeedback.findOne({
      where: { roomId },
      attributes: [[db.sequelize.fn('AVG', db.sequelize.col('rating')), 'avgRating']]
    });

    await db.MeetingRoom.update(
      { bookingScore: avgRating.dataValues.avgRating || 0 },
      { where: { id: roomId } }
    );

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const bookings = await db.Booking.findAll({
      where,
      include: [{ model: db.MeetingRoom }],
      order: [['startTime', 'DESC']]
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await db.Booking.findOne({
      where: { id, userId }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    await auditLogger.log({
      entityType: 'booking',
      entityId: booking.id,
      action: 'cancel',
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    req.io.emit('bookingCancelled', { booking });

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};