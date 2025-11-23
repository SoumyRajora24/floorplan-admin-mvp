require('dotenv').config();
const db = require('../src/models');
const { Op } = require('sequelize');

// Room names and configurations
const ROOM_CONFIGS = [
  { name: 'Conference Room A', capacity: 20, amenities: ['projector', 'whiteboard', 'video-conference'] },
  { name: 'Conference Room B', capacity: 15, amenities: ['projector', 'whiteboard'] },
  { name: 'Conference Room C', capacity: 12, amenities: ['tv', 'whiteboard'] },
  { name: 'Meeting Room 101', capacity: 8, amenities: ['projector'] },
  { name: 'Meeting Room 102', capacity: 6, amenities: ['tv'] },
  { name: 'Meeting Room 103', capacity: 10, amenities: ['whiteboard'] },
  { name: 'Meeting Room 201', capacity: 4, amenities: [] },
  { name: 'Meeting Room 202', capacity: 6, amenities: ['projector'] },
  { name: 'Meeting Room 203', capacity: 8, amenities: ['tv', 'whiteboard'] },
  { name: 'Boardroom', capacity: 16, amenities: ['projector', 'video-conference', 'catering'] },
  { name: 'Training Room', capacity: 25, amenities: ['projector', 'whiteboard', 'sound-system'] },
  { name: 'Focus Room 1', capacity: 2, amenities: [] },
  { name: 'Focus Room 2', capacity: 2, amenities: [] },
  { name: 'Collaboration Space', capacity: 10, amenities: ['whiteboard', 'tv'] },
  { name: 'Innovation Lab', capacity: 12, amenities: ['projector', 'whiteboard', 'video-conference'] },
  { name: 'Quiet Room', capacity: 4, amenities: [] },
  { name: 'Client Meeting Room', capacity: 8, amenities: ['projector', 'video-conference', 'catering'] },
  { name: 'Workshop Room', capacity: 18, amenities: ['projector', 'whiteboard', 'sound-system'] },
  { name: 'Executive Suite', capacity: 6, amenities: ['projector', 'video-conference', 'catering'] },
  { name: 'Breakout Room', capacity: 5, amenities: ['tv'] }
];

// Generate random position on floor plan
function generatePosition(index) {
  const cols = 5;
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: 100 + (col * 200),
    y: 100 + (row * 200)
  };
}

// Generate random date after November 24th
function generateFutureDate(baseDate = new Date('2024-11-24')) {
  const daysOffset = Math.floor(Math.random() * 60) + 1; // 1-60 days after Nov 24
  const hoursOffset = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hoursOffset, 0, 0, 0);
  return date;
}

async function seedRooms() {
  try {
    console.log('🌱 Starting room seeding...\n');

    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get or create a floor plan
    let floorPlan = await db.FloorPlan.findOne();
    
    if (!floorPlan) {
      console.log('⚠️  No floor plan found. Creating a default floor plan...');
      
      // Get or create a default user
      let user = await db.User.findOne();
      if (!user) {
        console.log('⚠️  No user found. Creating a default admin user...');
        user = await db.User.create({
          name: 'Admin User',
          email: 'admin@example.com',
          password: '$2b$10$rOzJqZqZqZqZqZqZqZqZqO', // You'll need to hash this properly
          role: 'admin',
          isActive: true
        });
      }

      floorPlan = await db.FloorPlan.create({
        name: 'Main Building - Floor 1',
        description: 'Default floor plan for seeding',
        buildingName: 'Main Building',
        floorNumber: 1
      });

      // Create initial version
      const versionControl = require('../src/services/versionControl');
      await versionControl.createVersion(
        floorPlan.id,
        user.id,
        { nodes: [], edges: [] },
        'Initial floor plan creation'
      );

      console.log(`✅ Created floor plan: ${floorPlan.name} (ID: ${floorPlan.id})\n`);
    } else {
      console.log(`✅ Using existing floor plan: ${floorPlan.name} (ID: ${floorPlan.id})\n`);
    }

    // Check existing rooms
    const existingRooms = await db.MeetingRoom.count({
      where: { floorPlanId: floorPlan.id }
    });
    console.log(`📊 Existing rooms: ${existingRooms}`);

    // Create 20 rooms
    const roomsToCreate = 20;
    const rooms = [];
    
    console.log(`\n🏗️  Creating ${roomsToCreate} meeting rooms...\n`);

    for (let i = 0; i < roomsToCreate; i++) {
      const config = ROOM_CONFIGS[i] || {
        name: `Room ${i + 1}`,
        capacity: Math.floor(Math.random() * 20) + 4,
        amenities: []
      };

      const room = await db.MeetingRoom.create({
        floorPlanId: floorPlan.id,
        name: config.name,
        capacity: config.capacity,
        position: generatePosition(i),
        amenities: config.amenities,
        isActive: true,
        bookingScore: Math.random() * 5 // Random score 0-5
      });

      rooms.push(room);
      console.log(`  ✅ Created: ${room.name} (Capacity: ${room.capacity}, Amenities: ${config.amenities.join(', ') || 'none'})`);
    }

    console.log(`\n✅ Successfully created ${rooms.length} rooms!\n`);

    // Create some sample bookings for dates after November 24th
    console.log('📅 Creating sample bookings for dates after November 24th...\n');

    const users = await db.User.findAll({ limit: 3 });
    if (users.length === 0) {
      console.log('⚠️  No users found. Skipping booking creation.');
      console.log('   Create at least one user to generate bookings.\n');
    } else {
      const baseDate = new Date('2024-11-24');
      const bookingsToCreate = 15; // Create 15 sample bookings
      
      for (let i = 0; i < bookingsToCreate; i++) {
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        const startTime = generateFutureDate(baseDate);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + (Math.floor(Math.random() * 3) + 1)); // 1-3 hour meetings

        // Check if this booking would conflict
        const conflicting = await db.Booking.findOne({
          where: {
            roomId: room.id,
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
          }
        });

        if (!conflicting) {
          const booking = await db.Booking.create({
            roomId: room.id,
            userId: user.id,
            title: `Meeting ${i + 1}`,
            startTime: startTime,
            endTime: endTime,
            attendees: Math.min(Math.floor(Math.random() * room.capacity) + 1, room.capacity),
            status: 'confirmed'
          });

          const dateStr = startTime.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          console.log(`  ✅ Booking: ${room.name} on ${dateStr} by ${user.name}`);
        }
      }
      console.log(`\n✅ Created sample bookings!\n`);
    }

    // Summary
    const totalRooms = await db.MeetingRoom.count({ where: { floorPlanId: floorPlan.id } });
    const totalBookings = await db.Booking.count({
      include: [{
        model: db.MeetingRoom,
        where: { floorPlanId: floorPlan.id }
      }]
    });

    console.log('📊 Seeding Summary:');
    console.log(`   Floor Plan: ${floorPlan.name}`);
    console.log(`   Total Rooms: ${totalRooms}`);
    console.log(`   Total Bookings: ${totalBookings}`);
    console.log('\n✅ Seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

// Run the seed script
if (require.main === module) {
  seedRooms()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedRooms;

