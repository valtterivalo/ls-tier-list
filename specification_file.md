# League of Legends Community Tier List Website Specification
**Version**: 1.2  
**Date**: March 15, 2025  
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

2. **Tier Lists** ✅
   - Five separate tier lists: Top, Jungle, Mid, ADC, Support.
   - Tiers: God (1%), S (4%), A (15%), B (20%), C (20%), D (15%), F (4%), Shit (1%).
   - Percentages are applied per role, rounding up to the nearest whole champion.
   - Champions start in B and C tiers until sufficient votes are collected.

3. **Champion Roles** ✅
   - Champions can appear in multiple role-based tier lists (e.g., Maokai in Top, Jungle, Support).
   - Roles are sourced from champion_roles.json file with official Riot role data.
   - Admin panel allows updating roles from the JSON file or manually per champion.

4. **User Interface** ✅
   - Dark mode design with customizable color scheme (CSS variables).
   - Each tier list displays champion portraits (fetched from Riot API) with up/down arrows for voting.
   - Current tier standings are visible to users before voting.
   - Vote counts are hidden from users to prevent bias.

5. **Admin Panel** ✅
   - Accessible via a secret URL with simple password authentication.
   - Features:
     - **Soft Reset**: Reduces all vote counts by a configurable percentage.
     - **Modify Roles**: Add/remove roles for a champion.
     - **Snapshot Management**: Save and restore from snapshots.
     - **Testing Tools**: Simulate votes, verify tier distributions, and run health checks.

6. **Safety and Recovery** ✅
   - Snapshots are saved automatically daily.
   - Manual snapshot creation via admin panel.
   - Restore to a snapshot via admin panel to recover from issues.

7. **Testing and Maintenance** ✅
   - Vote simulation for testing tier assignments.
   - Tier distribution verification to ensure correct percentages.
   - System health checks for monitoring.
   - API endpoint for automated monitoring.

---

## Implementation Status

### Completed Features
- ✅ Backend API with Express and Node.js
- ✅ SQLite database integration
- ✅ Champion data fetching from Riot API
- ✅ Vote recording and champion tier assignment
- ✅ Responsive React frontend
- ✅ Rate limiting for API requests
- ✅ Admin panel with all required functionality
- ✅ Automatic daily snapshots
- ✅ Bayesian adjustment for fair tier assignment
- ✅ Testing tools for vote simulation and verification
- ✅ Health check endpoint for monitoring
- ✅ Dark mode UI with customizable colors

### Remaining Steps for Production Deployment
1. **Server Deployment**:
   - Choose a hosting provider (Replit, Heroku, Render, etc.)
   - Set up environment variables:
     - `ADMIN_PASSWORD` (required, strong password for admin access)
     - `PORT` (optional, defaults to 5000)
     - `NODE_ENV` (set to 'production' for production deployment)
   - Configure persistent storage for the SQLite database
   - Set up automatic backups (recommended daily)

2. **Post-Deployment Verification**:
   - Run the health check endpoint (`/api/health`)
   - Verify database seeding works correctly
   - Test voting functionality with simulated votes
   - Confirm tier assignments update properly
   - Test admin functions
   - Verify responsive design on mobile devices

---

## Technical Implementation

### Tech Stack
- **Frontend**: React (JavaScript) for dynamic UI ✅
- **Backend**: Node.js with Express for API and logic ✅
- **Database**: SQLite for simplicity and portability ✅
- **External APIs**: Riot Data Dragon for champion data ✅

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
- If average votes per champion is below threshold (5), place champions in B and C tiers only.
- Otherwise, assign to tiers based on percentage distribution:
  - Top 1% → God
  - Next 4% → S
  - Next 15% → A
  - Next 20% → B
  - Next 20% → C
  - Next 15% → D
  - Next 4% → F
  - Bottom 1% → Shit
- Round up to the nearest whole champion per tier.
- If rounding exceeds 100%, shift excess into B or C tiers (middle).

### Fraud Prevention ✅
- **Cookies**: Generate a UUID cookie per user (stored client-side and checked server-side).
- **Rate Limiting**: Max 50 votes per IP address per 24 hours.
- **Soft Reset**: Admin ability to reduce vote counts across the board.

### Testing Tools ✅
- **Vote Simulation**: Generate random votes for testing with configurable parameters:
  - Number of votes to generate
  - Role filtering
  - Champion bias (certain champions receive more votes)
- **Tier Verification**: Check if champions are distributed correctly across tiers
- **Health Check**: Verify API and database connectivity

---

## Deployment

### Production Deployment Steps

#### Option 1: Replit Deployment
1. **Create a new Replit project**:
   - Choose Node.js as the template
   - Import the codebase from GitHub or upload files

2. **Configure environment variables**:
   - In Replit, go to "Secrets" tab
   - Add the following secrets:
     - `ADMIN_PASSWORD`: Strong password for admin access
     - `PORT`: 3000 (or let Replit assign one)
     - `NODE_ENV`: production

3. **Initialize the application**:
   - In the Replit shell, run:
     ```
     npm install
     npm run init
     ```
   - This will install dependencies and seed the database

4. **Configure Replit to run the application**:
   - In the `.replit` file, ensure the run command is:
     ```
     run = "npm start"
     ```

5. **Set up persistent storage**:
   - Enable Replit's persistent storage feature
   - Ensure the `db` directory is in the persistent storage path

#### Option 2: VPS/Cloud Deployment
1. **Provision a server**:
   - Minimum requirements: 1GB RAM, 1 CPU core
   - Recommended OS: Ubuntu 20.04 LTS or newer

2. **Install dependencies**:
   ```bash
   apt update && apt upgrade -y
   apt install -y nodejs npm git
   ```

3. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ls-tierlist.git
   cd ls-tierlist
   ```

4. **Set up environment variables**:
   ```bash
   echo 'ADMIN_PASSWORD=your_secure_password' > .env
   echo 'PORT=3000' >> .env
   echo 'NODE_ENV=production' >> .env
   ```

5. **Install dependencies and initialize**:
   ```bash
   npm install
   npm run init
   ```

6. **Set up process manager (PM2)**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name ls-tierlist
   pm2 startup
   pm2 save
   ```

7. **Set up reverse proxy (Nginx)**:
   ```bash
   apt install -y nginx
   ```
   Configure Nginx to proxy requests to the Node.js application

8. **Set up automatic backups**:
   ```bash
   mkdir -p /backups/ls-tierlist
   ```
   Create a cron job to copy the database file daily

### Directory Structure
```
ls-tierlist/
├── client/                  # React frontend
│   ├── public/              # Static files
│   └── src/                 # React source code
│       ├── components/      # React components
│       └── App.js           # Main React component
├── db/                      # SQLite database directory
├── champion_roles/          # Champion role data
│   └── champion_roles.json  # Official champion role data
├── server/                  # Server-side code
│   ├── middleware/          # Express middleware
│   └── utils/               # Utility functions
├── server.js                # Express server main file
├── seed-champions.js        # Database seeding script
├── init.js                  # Initialization script
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

### Production Readiness Checklist
- ✅ **Security**: Password protection, rate limiting
- ✅ **Data Integrity**: Snapshots, backups, validation
- ✅ **Performance**: Optimized database queries, transaction support
- ✅ **Monitoring**: Health check endpoint, error logging
- ✅ **Documentation**: Updated specification, deployment instructions
- ✅ **Testing**: Vote simulation, tier verification

---

## License

MIT