const db = require('../models');
const { Op } = require('sequelize');

class RoomSuggestionService {
  async suggestRooms(params) {
    const { capacity, startTime, endTime, userId, teamId, preferences = {}, referencePosition = null } = params;

    // Get available rooms
    const availableRooms = await this.getAvailableRooms(capacity, startTime, endTime);

    if (availableRooms.length === 0) {
      return [];
    }

    // Get user booking history
    const userHistory = await this.getUserBookingHistory(userId);
    const teamHistory = teamId ? await this.getTeamBookingHistory(teamId) : [];

    // Get reference position (user's last booked room or provided position)
    let refPosition = referencePosition;
    if (!refPosition && userHistory && userHistory.length > 0) {
      const lastBooking = userHistory[0];
      if (lastBooking.MeetingRoom && lastBooking.MeetingRoom.position) {
        refPosition = lastBooking.MeetingRoom.position;
      }
    }

    // Score each room
    const scoredRooms = await Promise.all(
      availableRooms.map(room => this.scoreRoom(room, {
        capacity,
        userHistory,
        teamHistory,
        preferences,
        referencePosition: refPosition,
        allRooms: availableRooms
      }))
    );

    // Check which room was last booked (for indicator)
    const mostRecentBooking = userHistory && userHistory.length > 0 ? userHistory[0] : null;
    const lastBookedRoomId = mostRecentBooking ? mostRecentBooking.roomId : null;

    // Sort by score (highest first)
    scoredRooms.sort((a, b) => b.totalScore - a.totalScore);

    return scoredRooms.map(sr => ({
      room: sr.room,
      score: sr.totalScore,
      reasoning: sr.reasoning,
      proximity: sr.proximity,
      isLastBooked: sr.room.id === lastBookedRoomId
    }));
  }

  async getAvailableRooms(capacity, startTime, endTime) {
    // Find rooms with sufficient capacity
    const rooms = await db.MeetingRoom.findAll({
      where: {
        capacity: { [Op.gte]: capacity },
        isActive: true
      },
      include: [{
        model: db.Booking,
        required: false,
        where: {
          status: { [Op.ne]: 'cancelled' },
          [Op.or]: [
            {
              startTime: { [Op.between]: [startTime, endTime] }
            },
            {
              endTime: { [Op.between]: [startTime, endTime] }
            },
            {
              [Op.and]: [
                { startTime: { [Op.lte]: startTime } },
                { endTime: { [Op.gte]: endTime } }
              ]
            }
          ]
        }
      }]
    });

    // Filter out rooms with conflicting bookings
    return rooms.filter(room => room.Bookings.length === 0);
  }

  async getUserBookingHistory(userId) {
    return await db.Booking.findAll({
      where: { userId, status: 'confirmed' },
      include: [{ model: db.MeetingRoom }],
      order: [['startTime', 'DESC']],
      limit: 20
    });
  }

  async getTeamBookingHistory(teamId) {
    const teamUsers = await db.User.findAll({
      where: { teamId },
      attributes: ['id']
    });

    const userIds = teamUsers.map(u => u.id);

    return await db.Booking.findAll({
      where: { userId: { [Op.in]: userIds }, status: 'confirmed' },
      include: [{ model: db.MeetingRoom }],
      order: [['startTime', 'DESC']],
      limit: 50
    });
  }

  async scoreRoom(room, context) {
    const scores = {
      capacityFit: this.scoreCapacityFit(room.capacity, context.capacity),
      userHistory: this.scoreUserHistory(room, context.userHistory),
      teamHistory: this.scoreTeamHistory(room, context.teamHistory),
      feedback: await this.scoreFeedback(room.id),
      amenities: this.scoreAmenities(room.amenities, context.preferences.amenities),
      proximity: this.scoreProximity(room, context.referencePosition, context.allRooms)
    };

    // Check if this is the last booked room
    const mostRecentBooking = context.userHistory && context.userHistory.length > 0 
      ? context.userHistory[0] 
      : null;
    const isLastBooked = mostRecentBooking && mostRecentBooking.roomId === room.id;

    // Increase weight for userHistory if it's the last booked room (recency boost)
    const weights = {
      capacityFit: 0.25,
      userHistory: isLastBooked ? 0.25 : 0.15, // Higher weight for last booked
      teamHistory: 0.1,
      feedback: 0.2,
      amenities: 0.1,
      proximity: isLastBooked ? 0.1 : 0.2 // Slightly reduce proximity weight for last booked
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    const reasoning = this.generateReasoning(scores, weights, isLastBooked);

    return {
      room,
      totalScore,
      scores,
      reasoning,
      proximity: scores.proximity,
      isLastBooked
    };
  }

  scoreCapacityFit(roomCapacity, requiredCapacity) {
    // Perfect fit scores highest, oversized rooms score lower
    const ratio = roomCapacity / requiredCapacity;
    if (ratio >= 1 && ratio <= 1.2) return 100; // Perfect fit
    if (ratio > 1.2 && ratio <= 1.5) return 80;
    if (ratio > 1.5 && ratio <= 2) return 60;
    if (ratio > 2) return 40;
    return 0; // Too small (shouldn't happen due to filtering)
  }

  scoreUserHistory(room, userHistory) {
    if (!userHistory || userHistory.length === 0) return 50;

    // Check if this room was in the MOST RECENT booking (highest priority)
    const mostRecentBooking = userHistory[0]; // Already sorted by startTime DESC
    const isLastBookedRoom = mostRecentBooking && mostRecentBooking.roomId === room.id;

    // Base score from frequency
    const roomBookings = userHistory.filter(b => b.roomId === room.id);
    const frequency = (roomBookings.length / userHistory.length) * 100;
    let baseScore = Math.min(frequency * 2, 100);

    // MAJOR BOOST for most recently booked room (+40 points)
    if (isLastBookedRoom) {
      baseScore = Math.min(baseScore + 40, 100);
    } else {
      // Time-decay boost for recent bookings (within last 30 days)
      const now = new Date();
      const recentBookings = roomBookings.filter(booking => {
        const bookingDate = new Date(booking.startTime);
        const daysSince = (now - bookingDate) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });

      if (recentBookings.length > 0) {
        // Give boost based on how recent (more recent = higher boost)
        const mostRecentRoomBooking = recentBookings[0];
        const bookingDate = new Date(mostRecentRoomBooking.startTime);
        const daysSince = (now - bookingDate) / (1000 * 60 * 60 * 24);
        
        // Decay: 30 days = 0 boost, 0 days = 20 boost
        const recencyBoost = Math.max(0, 20 * (1 - daysSince / 30));
        baseScore = Math.min(baseScore + recencyBoost, 100);
      }
    }

    return baseScore;
  }

  scoreTeamHistory(room, teamHistory) {
    if (!teamHistory || teamHistory.length === 0) return 50;

    const roomBookings = teamHistory.filter(b => b.roomId === room.id);
    const frequency = (roomBookings.length / teamHistory.length) * 100;

    return Math.min(frequency * 1.5, 100);
  }

  async scoreFeedback(roomId) {
    const feedback = await db.RoomFeedback.findAll({
      where: { roomId },
      attributes: ['rating']
    });

    if (feedback.length === 0) return 50;

    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    return (avgRating / 5) * 100;
  }

  scoreAmenities(roomAmenities, preferredAmenities) {
    if (!preferredAmenities || preferredAmenities.length === 0) return 50;

    const matches = preferredAmenities.filter(a => roomAmenities.includes(a));
    return (matches.length / preferredAmenities.length) * 100;
  }

  calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2 || !pos1.x || !pos1.y || !pos2.x || !pos2.y) {
      return null; // Cannot calculate distance without valid positions
    }

    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  scoreProximity(room, referencePosition, allRooms) {
    // If no reference position, score based on proximity to other available rooms
    if (!referencePosition) {
      // Score based on being close to other rooms (central location)
      if (!room.position || !allRooms || allRooms.length <= 1) {
        return 50; // Neutral score if no position data
      }

      // Calculate average distance to other rooms
      let totalDistance = 0;
      let count = 0;
      for (const otherRoom of allRooms) {
        if (otherRoom.id !== room.id && otherRoom.position) {
          const distance = this.calculateDistance(room.position, otherRoom.position);
          if (distance !== null) {
            totalDistance += distance;
            count++;
          }
        }
      }

      if (count === 0) return 50;

      const avgDistance = totalDistance / count;
      // Closer to other rooms (central location) scores higher
      // Normalize: closer = higher score (inverse relationship)
      // Assuming max distance of 1000 units, adjust based on your coordinate system
      const maxDistance = 1000;
      const normalizedDistance = Math.min(avgDistance / maxDistance, 1);
      return (1 - normalizedDistance) * 100;
    }

    // Score based on proximity to reference position
    if (!room.position) {
      return 30; // Lower score if room has no position data
    }

    const distance = this.calculateDistance(room.position, referencePosition);
    if (distance === null) {
      return 30;
    }

    // Closer rooms score higher
    // Normalize distance: assuming max distance of 1000 units
    // Adjust maxDistance based on your floor plan coordinate system
    const maxDistance = 1000;
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const proximityScore = (1 - normalizedDistance) * 100;

    // Boost score for very close rooms
    if (distance < 100) {
      return Math.min(proximityScore * 1.2, 100);
    }

    return proximityScore;
  }

  generateReasoning(scores, weights, isLastBooked = false) {
    const reasons = [];

    // Prioritize showing "Last booked here" if applicable
    if (isLastBooked) {
      reasons.push('⭐ Last booked here');
    }

    if (scores.capacityFit >= 80) {
      reasons.push('Excellent capacity fit');
    } else if (scores.capacityFit >= 60) {
      reasons.push('Good capacity fit');
    }

    if (scores.userHistory >= 90) {
      reasons.push('Your most recent booking');
    } else if (scores.userHistory >= 70) {
      reasons.push('Frequently used by you');
    }

    if (scores.teamHistory >= 70) {
      reasons.push('Popular with your team');
    }

    if (scores.feedback >= 80) {
      reasons.push('Highly rated');
    }

    if (scores.amenities >= 80) {
      reasons.push('Has preferred amenities');
    }

    if (scores.proximity >= 80) {
      reasons.push('Close to your location');
    } else if (scores.proximity >= 60) {
      reasons.push('Nearby location');
    }

    return reasons.join(', ') || 'Available and suitable';
  }
}

module.exports = new RoomSuggestionService();
