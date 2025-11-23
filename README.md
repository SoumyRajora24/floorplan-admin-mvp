# Floor Plan Admin System MVP

## Project Overview

The Floor Plan Admin System is a full-stack web application designed for managing visual floor plans with multi-admin editing capabilities. The system provides real-time collaboration, version control, offline support, smart booking features, and comprehensive audit logging. This MVP demonstrates enterprise-level features including conflict resolution, offline synchronization, and role-based access control.

### Key Highlights

- **Visual Floor Plan Editing**: Drag-and-drop interface powered by React Flow
- **Real-time Collaboration**: Multiple admins can edit simultaneously with conflict detection
- **Offline-First Architecture**: Edit floor plans offline with automatic synchronization when online
- **Version Control**: Complete audit trail and version history for all changes
- **Smart Booking System**: Intelligent room booking with suggestions based on availability and preferences
- **Scalable Backend**: Modular architecture with PostgreSQL, Redis caching, and Socket.IO

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [Demonstration](#demonstration)
7. [Key Code Snippets](#key-code-snippets)
8. [Project Structure](#project-structure)

---

## Features

### 1. Visual Floor Plan Editor

The application provides an intuitive drag-and-drop interface for creating and editing floor plans. Users can add, move, and configure rooms and spaces visually.

**Screenshot Placeholder: Floor Plan Editor Interface**

![WhatsApp Image 2025-11-23 at 18 55 09_a802f9ba](https://github.com/user-attachments/assets/6e38fe04-cb40-4fa6-be1f-6aa7964721c7)


**Key Functionality:**
- Drag-and-drop room placement
- Visual node connections
- Real-time updates across all connected clients
- Responsive canvas with zoom and pan capabilities

### 2. Real-Time Collaboration

Multiple administrators can work on the same floor plan simultaneously. The system uses WebSocket connections to broadcast changes in real-time.

**Screenshot Placeholder: Real-Time Collaboration**

![WhatsApp Image 2025-11-23 at 18 55 09_a802f9ba](https://github.com/user-attachments/assets/b1b43743-40c1-45e8-abf8-25fedf50dc8a)



**Implementation Details:**
- Socket.IO for WebSocket communication
- Conflict detection and resolution system
- Role-based editing permissions

### 3. Offline Support

The application maintains full functionality even when offline. All changes are queued locally and automatically synchronized when the connection is restored.

**Screenshot Placeholder: Offline Indicator**

![WhatsApp Image 2025-11-23 at 18 55 36_9d9efc90](https://github.com/user-attachments/assets/1ab49621-d16c-43ca-980c-c8ef7408038e)



**Offline Features:**
- Local storage of pending changes
- Automatic retry mechanism
- Conflict resolution on sync
- Visual offline/online status indicator

### 4. Version Control & Audit Logging

Every change to floor plans is tracked with complete version history. Administrators can view, compare, and revert to previous versions.

**Screenshot Placeholder: Version History**

![WhatsApp Image 2025-11-23 at 18 56 05_6bac105b](https://github.com/user-attachments/assets/228d0f47-cbdf-45f4-a71f-15d63e3c45fa)


**Audit Capabilities:**
- Complete change history
- User attribution for each change
- Timestamp tracking
- Version comparison and rollback

### 5. Smart Room Booking

The booking system provides intelligent suggestions based on room availability, capacity, and user preferences.

**Screenshot Placeholder: Booking Interface**

![WhatsApp Image 2025-11-23 at 18 56 43_81207dc0](https://github.com/user-attachments/assets/b0714ff6-492c-427a-b979-d4d3f548a259)


**Booking Features:**
- Room availability checking
- Capacity-based suggestions
- Conflict detection
- Booking history and feedback

### 6. Authentication & Authorization

Secure JWT-based authentication with role-based access control (Admin, Editor, Viewer roles).

**Screenshot Placeholder: Login/Register**

![WhatsApp Image 2025-11-23 at 18 57 37_e7861e8b](https://github.com/user-attachments/assets/41298d33-42b4-4c40-a54a-e5203a1ba71a)



---

## Technology Stack

### Frontend
- **React 18.2.0**: Modern UI framework
- **React Flow 11.10.1**: Floor plan visualization and editing
- **Socket.IO Client 4.7.4**: Real-time communication
- **Zustand 4.4.7**: State management
- **LocalForage 1.10.0**: Offline data persistence
- **Axios 1.6.5**: HTTP client
- **React Hot Toast 2.4.1**: User notifications

### Backend
- **Node.js**: Runtime environment
- **Express 4.18.2**: Web framework
- **PostgreSQL**: Primary database
- **Redis 4.6.12**: Caching and session management
- **Socket.IO 4.7.4**: WebSocket server
- **Sequelize 6.37.7**: ORM for database operations
- **JWT (jsonwebtoken 9.0.2)**: Authentication
- **Cloudinary 2.8.0**: Image storage and optimization
- **Winston 3.11.0**: Logging

### DevOps & Tools
- **Docker & Docker Compose**: Containerization
- **Sequelize CLI**: Database migrations
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Express Rate Limit**: API protection

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   React Client  │◄───────►│  Express API    │
│   (Frontend)    │  HTTP   │   (Backend)     │
└─────────────────┘         └─────────────────┘
         │                           │
         │ WebSocket                  │
         │ (Socket.IO)                │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Socket.IO      │         │   PostgreSQL    │
│  Server         │         │   Database      │
└─────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │      Redis      │
                            │     Cache       │
                            └─────────────────┘
```


### Data Flow

1. **User Actions**: Frontend captures user interactions (drag, drop, edit)
2. **State Management**: Zustand stores manage application state
3. **API Calls**: Axios sends HTTP requests to backend
4. **WebSocket Updates**: Socket.IO broadcasts changes to all connected clients
5. **Database Persistence**: Sequelize ORM handles database operations
6. **Caching**: Redis caches frequently accessed data
7. **Offline Queue**: LocalForage stores pending changes when offline

---

## Installation & Setup

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **Docker Desktop** (for PostgreSQL and Redis)
- **npm** or **yarn** package manager
- **Git** (for cloning the repository)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd floorplan-admin-mvp
```

### Step 2: Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create environment file:

```bash
cp .env.example .env
```

### Step 3: Database Setup

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Run database migrations:

```bash
npx sequelize-cli db:migrate
```

(Optional) Seed initial data:

```bash
npm run seed:rooms
```


### Step 4: Start Backend Server

```bash
npm start
```

The backend server will start on `http://localhost:5000` (or the port specified in your `.env` file).


### Step 5: Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm start
```

The frontend application will open at `http://localhost:3000`.

### Step 6: Verify Installation

1. Open `http://localhost:3000` in your browser
2. Register a new account or login
3. Create or select a floor plan
4. Verify that the editor loads correctly

**Screenshot Placeholder: Application Homepage**
![WhatsApp Image 2025-11-23 at 18 57 29_a5d37f70](https://github.com/user-attachments/assets/57db97e9-f66c-4f81-b9c2-b6965c0b4162)


---

## Configuration

### Environment Variables

#### Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=floorplan_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Image Upload Configuration

#### Cloudinary Setup (Recommended)

For production deployments, Cloudinary provides optimized image delivery:

1. Sign up at [Cloudinary](https://cloudinary.com/) (free tier available)
2. Get credentials from [Dashboard](https://cloudinary.com/console)
3. Add credentials to `backend/.env`

**Benefits:**
- ✅ No CORS issues (CDN delivery)
- ✅ Automatic image optimization
- ✅ Better scalability
- ✅ Free tier: 25GB storage, 25GB bandwidth/month


#### Local Storage (Fallback)

If Cloudinary is not configured, images are stored locally in `backend/uploads/floorplans/`. The application automatically falls back to local storage.

---

## Demonstration

### Video Demonstration



---

## Key Code Snippets

### Frontend: Floor Plan Editor Component

The main editor component uses React Flow for visualization:

```javascript
// frontend/src/components/FloorPlanEditor/FloorPlanEditor.js
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';

function FloorPlanEditor({ floorPlanId, onBack }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // Handle node drag
  const onNodesChange = useCallback((changes) => {
    // Update nodes and sync with backend
    setNodes((nds) => applyNodeChanges(changes, nds));
    syncChanges(changes);
  }, []);

  return (
    <div className="floor-plan-editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### Backend: Real-Time Socket Handler

WebSocket server handles real-time updates:

```javascript
// backend/src/sockets/index.js
io.on('connection', (socket) => {
  socket.on('join-floorplan', (floorPlanId) => {
    socket.join(`floorplan-${floorPlanId}`);
  });

  socket.on('floorplan-update', (data) => {
    // Broadcast to all clients in the room
    io.to(`floorplan-${data.floorPlanId}`)
      .emit('floorplan-updated', data);
  });
});
```

### Offline Sync Service

Handles offline changes and synchronization:

```javascript
// frontend/src/services/offlineStorage.js
export const queueChange = async (change) => {
  const queue = await localforage.getItem('syncQueue') || [];
  queue.push({
    ...change,
    timestamp: Date.now(),
    synced: false
  });
  await localforage.setItem('syncQueue', queue);
};

export const syncQueue = async () => {
  const queue = await localforage.getItem('syncQueue') || [];
  for (const change of queue) {
    if (!change.synced) {
      try {
        await api.post('/sync', change);
        change.synced = true;
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
  await localforage.setItem('syncQueue', queue.filter(c => !c.synced));
};
```

### Conflict Resolution Service

Detects and resolves editing conflicts:

```javascript
// backend/src/services/conflictResolution.js
export const detectConflict = (serverVersion, clientVersion) => {
  if (serverVersion.updatedAt > clientVersion.updatedAt) {
    return {
      hasConflict: true,
      serverVersion,
      clientVersion
    };
  }
  return { hasConflict: false };
};

export const resolveConflict = (conflict, resolution) => {
  // Merge or overwrite based on resolution strategy
  if (resolution === 'server') {
    return conflict.serverVersion;
  } else if (resolution === 'client') {
    return conflict.clientVersion;
  } else {
    return mergeVersions(conflict.serverVersion, conflict.clientVersion);
  }
};
```

### Version Control Service

Manages floor plan versioning:

```javascript
// backend/src/services/versionControl.js
export const createVersion = async (floorPlanId, changes, userId) => {
  const version = await FloorPlanVersion.create({
    floorPlanId,
    versionNumber: await getNextVersionNumber(floorPlanId),
    changes: JSON.stringify(changes),
    createdBy: userId
  });
  
  await auditLogger.log({
    action: 'VERSION_CREATED',
    floorPlanId,
    userId,
    metadata: { versionNumber: version.versionNumber }
  });
  
  return version;
};
```

---

## Project Structure

```
floorplan-admin-mvp/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   ├── auth.js
│   │   │   └── cloudinary.js
│   │   ├── controllers/     # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── floorPlanController.js
│   │   │   ├── bookingController.js
│   │   │   └── versionController.js
│   │   ├── models/          # Database models
│   │   │   ├── User.js
│   │   │   ├── FloorPlan.js
│   │   │   ├── Booking.js
│   │   │   └── AuditLog.js
│   │   ├── routes/          # API routes
│   │   │   ├── auth.js
│   │   │   ├── floorplan.js
│   │   │   └── bookings.js
│   │   ├── services/        # Business logic
│   │   │   ├── conflictResolution.js
│   │   │   ├── offlineSync.js
│   │   │   ├── versionControl.js
│   │   │   └── roomSuggestions.js
│   │   ├── sockets/         # WebSocket handlers
│   │   │   └── index.js
│   │   ├── middleware/      # Express middleware
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   └── index.js         # Entry point
│   ├── migrations/          # Database migrations
│   ├── uploads/             # Local file storage
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── FloorPlanEditor/
│   │   │   ├── BookingPanel/
│   │   │   └── VersionHistory/
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useFloorPlan.js
│   │   │   └── useOfflineSync.js
│   │   ├── services/        # API services
│   │   │   ├── api.js
│   │   │   ├── socket.js
│   │   │   └── offlineStorage.js
│   │   ├── stores/          # State management
│   │   │   ├── authStore.js
│   │   │   └── offlineStore.js
│   │   └── App.js           # Main component
│   └── package.json
│
├── docker-compose.yml       # Docker configuration
└── README.md
```


---

## Additional Information

### Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting on API endpoints
- Helmet.js for security headers
- Input validation with Joi

### Performance Optimizations

- Redis caching for frequently accessed data
- Database query optimization
- Image optimization via Cloudinary
- Lazy loading of components
- Efficient state management with Zustand

### Future Enhancements

- Mobile app support
- Advanced analytics dashboard
- Export to PDF/image formats
- Integration with calendar systems
- Advanced conflict resolution strategies
- Multi-language support

---
