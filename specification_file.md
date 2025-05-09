# League of Legends Community Tier List Website Specification
**Version**: 1.5  
**Date**: March 30, 2025  
**Author**: Grok 3 (xAI) + Claude 3.7  
**Purpose**: A minimalist, community-driven tier list for League of Legends champions, split by role, with up/down voting and admin controls.

---

## Overview
This web application allows users to vote on League of Legends champions (up or down) across five role-based tier lists: Top, Jungle, Mid, ADC, and Support. Champions are ranked into tiers (God, S, A, B, C, D, F, Shit) based on normalized community votes, with a fixed percentage distribution. The app is designed for simplicity in development, deployment, and use, with an admin panel for maintenance.

---

## Functional Requirements

### Core Features
1. **Voting System** ✅
   - Users can vote once per champion per role (up or down).
   - Voting is tracked via browser cookies (UUID stored client-side).
   - Votes are tallied and normalized to assign champions to tiers.
   - User votes are visually displayed after voting and persist between sessions.

2. **Tier Lists** ✅
   - Five separate tier lists: Top, Jungle, Mid, ADC, Support.
   - Tiers: God (1%), S (8%), A (15%), B (18%), C (18%), D (15%), F (4%), Shit (1%).
   - Percentages are applied per role, rounding up to the nearest whole champion.
   - Champions start in B and C tiers until sufficient votes are collected (average 3 votes per champion).

3. **Champion Roles** ✅
   - Champions can appear in multiple role-based tier lists (e.g., Maokai in Top, Jungle, Support).
   - Roles are sourced from champion_roles.json file with official Riot role data.
   - Admin panel allows updating roles from the JSON file or manually per champion.

4. **User Interface** ✅
   - Dark mode design with customizable color scheme (CSS variables).
   - Each tier list displays champion portraits (fetched from Riot API) with up/down arrows for voting.
   - Current tier standings are visible to users before voting.
   - Total votes per champion are displayed, but individual up/down counts are hidden to prevent bias.
   - User's previous votes are visually indicated and persist between sessions.

5. **Admin Panel** ✅
   - Accessible via a secret URL with simple password authentication.
   - Features:
     - **Soft Reset**: Reduces all vote counts by a configurable percentage.
     - **Reset User Voting**: Allows users to vote again while preserving vote data and tier standings.
     - **Modify Roles**: Add/remove roles for a champion.
     - **Snapshot Management**: Save and restore from snapshots.
     - **Testing Tools**: Simulate votes, verify tier distributions, and run health checks.
     - **Vote Backup & Restore**: Export and import vote data for backup or migration.

6. **Safety and Recovery** ✅
   - Snapshots are saved automatically daily.
   - Manual snapshot creation via admin panel.
   - Restore to a snapshot via admin panel to recover from issues.
   - Vote data can be exported and imported for backup purposes.

7. **Testing and Maintenance** ✅
   - Vote simulation for testing tier assignments.
   - Tier distribution verification to ensure correct percentages.
   - System health checks for monitoring.
   - API endpoint for automated monitoring.

8. **Environment Management** ✅
   - Separate development and production environments.
   - Environment-specific database files.
   - Configuration via environment variables.

---

## Implementation Status

### Completed Features
- ✅ Backend API with Express and Node.js
- ✅ SQLite database integration
- ✅ Champion data fetching from Riot API
- ✅ Vote recording and champion tier assignment
- ✅ Responsive React frontend
- ✅ Rate limiting for API requests (250 votes per IP per day)
- ✅ Admin panel with all required functionality
- ✅ Automatic daily snapshots
- ✅ Bayesian adjustment for fair tier assignment
- ✅ Testing tools for vote simulation and verification
- ✅ Health check endpoint for monitoring
- ✅ Dark mode UI with customizable colors
- ✅ Environment-specific configuration (dev/prod)
- ✅ Production deployment to Render
- ✅ Database persistence configuration
- ✅ Vote UI persistence between user sessions
- ✅ Vote backup and restore functionality
- ✅ Reset user voting without losing tier data
- ✅ Improved tier distribution with more champions in S tier
- ✅ Total vote counts display per champion

### Future Enhancements
1. **Administration Improvements**:
   - Enhanced vote reporting in admin panel
   - Database backup and download functionality
   - Admin authentication improvements (session-based)
   - Analytics dashboard

2. **User Experience**:
   - Champion search functionality
   - Mobile app version
   - User accounts (optional)
   - Historical tier tracking

3. **Performance & Infrastructure**:
   - Migration to PostgreSQL for larger scale
   - CDN integration for champion images
   - API rate limiting refinements
   - Automated testing pipeline

---

## Technical Implementation

### Tech Stack
- **Frontend**: React (JavaScript) for dynamic UI ✅
- **Backend**: Node.js with Express for API and logic ✅
- **Database**: SQLite for simplicity and portability ✅
- **External APIs**: Riot Data Dragon for champion data ✅
- **Deployment**: Render for hosting ✅

### Database Schema
```sql
-- Champions table: Stores champion metadata
CREATE TABLE champions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  roles TEXT NOT NULL, -- Comma-separated string (e.g., "Top,Jungle,Support")
  portrait_url TEXT NOT NULL -- URL to champion portrait
);

-- Votes table: Tracks individual votes
CREATE TABLE votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  champion_id INTEGER NOT NULL,
  role TEXT NOT NULL, -- e.g., "Top", "Jungle"
  user_cookie TEXT NOT NULL, -- UUID from cookie
  vote INTEGER NOT NULL, -- 1 (up) or -1 (down)
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (champion_id) REFERENCES champions(id),
  UNIQUE (champion_id, role, user_cookie) -- Prevents duplicate votes
);

-- Snapshots table: Stores state backups
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- e.g., "2025-03-07-auto" or "admin-pre-patch"
  data BLOB NOT NULL, -- JSON dump of votes table
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Environment Management ✅

The application supports separate development and production environments:

```javascript
// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Database file selection
const dbFileName = isProduction ? 'tierlist-prod.db' : 'tierlist-dev.db';
const dbDir = isProduction ? 
  process.env.RENDER_DISK_PATH || '/opt/render/project/data' : // For Render deployment
  path.join(__dirname, 'db');
const dbFile = path.join(dbDir, dbFileName);
```

### Voting Algorithm ✅

#### Normalization
For each champion in a role:
- Calculate `total_votes = upvotes + downvotes`.
- Calculate `score = upvotes / total_votes` (percent positive, range 0 to 1).
- If `total_votes < threshold` (e.g., 10), apply a Bayesian adjustment:
  - `adjusted_score = (upvotes + k * avg_global_score) / (total_votes + k)`, where:
    - `k = 10` (tunable constant),
    - `avg_global_score = average score across all champs in that role`.
- Use `adjusted_score` as the ranking metric.

#### Tier Assignment
- Sort champions by `adjusted_score` descending within each role.
- If average votes per champion is below threshold (3), place champions in B and C tiers only.
- Otherwise, assign to tiers based on percentage distribution:
  - Top 1% → God
  - Next 8% → S (increased from 4%)
  - Next 15% → A
  - Next 18% → B (reduced from 20%)
  - Next 18% → C (reduced from 20%)
  - Next 15% → D
  - Next 4% → F
  - Bottom 1% → Shit
- Round up to the nearest whole champion per tier.
- If rounding exceeds 100%, shift excess into B or C tiers (middle).

### Vote Persistence and User Experience ✅
- **Cookies**: Generate a UUID cookie per user (stored client-side in localStorage).
- **Vote Tracking**: User's previous votes are fetched on page load and visually displayed.
- **Vote Indication**: Active votes are highlighted to users so they know what they've already voted on.
- **Vote UI Persistence**: Vote UI state persists between sessions, even after browser refresh.
- **Vote Count Display**: Total votes per champion are shown, but individual up/down counts remain hidden.

### Fraud Prevention ✅
- **Cookies**: Generate a UUID cookie per user (stored client-side and checked server-side).
- **Rate Limiting**: Max 250 votes per IP address per 24 hours.
- **Soft Reset**: Admin ability to reduce vote counts across the board.
- **Reset User Voting**: Admin ability to allow users to vote again while preserving tier data.

### Vote Backup and Restore ✅
- **Export Votes**: Download vote data as JSON for backup purposes, filterable by role.
- **Import Votes**: Restore vote data from previously exported JSON file.
- **Champion Mapping**: Import functionality maps champions by name rather than ID for flexibility.
- **Replace Option**: Choice to replace existing votes or merge with current votes during import.

### Testing Tools ✅
- **Vote Simulation**: Generate random votes for testing with configurable parameters:
  - Number of votes to generate
  - Role filtering
  - Champion bias (certain champions receive more votes)
- **Tier Verification**: Check if champions are distributed correctly across tiers
- **Health Check**: Verify API and database connectivity

---

## Deployment

### Current Deployment
The application is currently deployed on Render (https://ls-tier-list.onrender.com/).

### Environment Variables
Required environment variables for production:
- `NODE_ENV`: Set to `production`
- `ADMIN_PASSWORD`: Admin panel access password
- `PORT`: Port for the application to run on (set by Render automatically)

### Database Persistence
To ensure database persistence between deployments:
- A Render Persistent Disk is required
- The database is stored at `/opt/render/project/data/tierlist-prod.db`
- This path is configured in the application code

### Deployment Process

#### Initial Deployment
1. **Create a Render Web Service**:
   - Connect to GitHub repository
   - Set build command: `npm run setup:prod`
   - Set start command: `npm run start:prod`
   - Add required environment variables
   - Create and attach a persistent disk

#### Updating the Production Application
1. **Development Workflow**:
   - Make changes in development environment
   - Test locally using `npm run start:dev`
   - Create a snapshot in production before deploying
   - Push changes to GitHub repository

2. **Automatic Deployment**:
   - Render automatically deploys when changes are pushed to the main branch
   - The database is preserved between deployments due to persistent storage

3. **Manual Deployment**:
   - Go to Render dashboard
   - Select the service
   - Click "Manual Deploy" > "Deploy latest commit"

### Production Maintenance

#### Database Management
1. **Snapshots**:
   - Created automatically daily
   - Should be manually created before updates
   - Can be restored via admin panel

2. **Vote Backup**:
   - Export votes before significant changes
   - Import votes if needed after changes
   - Use snapshot system as additional safety measure

#### Monitoring
1. **Health Check**:
   - `/api/health` endpoint provides system status
   - Can be integrated with external monitoring tools

2. **Error Reporting**:
   - Server errors are logged in Render logs
   - Application includes error handling middleware

---

## Directory Structure
```
ls-tierlist/
├── client/                  # React frontend
│   ├── public/              # Static files
│   ├── build/               # Production build output
│   └── src/                 # React source code
│       ├── components/      # React components
│       └── App.js           # Main React component
├── db/                      # SQLite database directory (development)
├── champion_roles/          # Champion role data
│   └── champion_roles.json  # Official champion role data
├── server/                  # Server-side code
│   ├── middleware/          # Express middleware
│   └── utils/               # Utility functions
├── server.js                # Express server main file
├── seed-champions.js        # Database seeding script
├── init.js                  # Initialization script
├── .env.production          # Production environment template
├── package.json             # Node.js dependencies
└── README.md                # Project documentation
```

---

## Project Management

### Milestones Completed
- ✅ **Setup**: Project initialized with React, Node/Express, and SQLite
- ✅ **Backend**: API endpoints, database integration, voting logic
- ✅ **Frontend**: Tier list UI, champion cards, voting UI
- ✅ **Admin Panel**: Soft reset, role editing, snapshot management
- ✅ **Testing**: API endpoints, core functionality, and testing tools
- ✅ **UI Improvements**: Dark mode, responsive design, usability enhancements
- ✅ **Environment Configuration**: Development/production environment separation
- ✅ **Production Deployment**: Successfully deployed to Render with persistent storage
- ✅ **Vote UI Persistence**: User votes persist between sessions
- ✅ **Vote Backup & Restore**: Vote export/import functionality
- ✅ **User Voting Reset**: Allow users to vote again without losing tier data
- ✅ **Tier Distribution Rebalance**: Modified tier percentages to allow more champions in S tier
- ✅ **UI Enhancements**: Added total vote count display and fixed layout shifts

### Production Readiness
- ✅ **Security**: Password protection, rate limiting
- ✅ **Data Integrity**: Snapshots, database persistence, vote backup/restore
- ✅ **Performance**: Optimized database queries, transaction support
- ✅ **Monitoring**: Health check endpoint, error logging
- ✅ **Documentation**: Updated specification, deployment instructions
- ✅ **Testing**: Vote simulation, tier verification

---

## License

MIT