# League of Legends Community Tier List Website Specification
**Version**: 1.1  
**Date**: March 07, 2025  
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

3. **Champion Roles** ✅
   - Champions can appear in multiple role-based tier lists (e.g., Maokai in Top, Jungle, Support).
   - Roles are sourced from an external API (Riot's Data Dragon) and stored locally.

4. **User Interface** ✅
   - Minimalist design with a customizable color scheme (CSS variables).
   - Each tier list displays champion portraits (fetched from Riot API) with up/down arrows for voting.
   - Current tier standings are visible to users before voting.

5. **Admin Panel** ✅
   - Accessible via a secret URL with simple password authentication.
   - Features:
     - **Soft Reset**: Reduces all vote counts by a configurable percentage.
     - **Modify Roles**: Add/remove roles for a champion.
     - **Snapshot Management**: Save and restore from snapshots.

6. **Safety and Recovery** ✅
   - Snapshots are saved automatically daily.
   - Manual snapshot creation via admin panel.
   - Restore to a snapshot via admin panel to recover from issues.

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

### Remaining Steps for MVP Deployment
1. **Replit Deployment**:
   - Create a new Replit project
   - Upload the codebase to Replit
   - Set up environment variables in Replit Secrets:
     - `ADMIN_PASSWORD`
     - `PORT` (optional, Replit will typically assign one)
   - Run the initialization script: `npm run init`
   - Configure Replit to run `npm start` on startup

2. **Post-Deployment Verification**:
   - Verify database seeding works correctly
   - Test voting functionality
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
- Assign to tiers based on percentage distribution:
  - Top 1% → God
  - Next 4% → S
  - (and so on...)
- Round up to the nearest whole champion per tier.
- If rounding exceeds 100%, shift excess into B or C tiers (middle).

### Fraud Prevention ✅
- **Cookies**: Generate a UUID cookie per user (stored client-side and checked server-side).
- **Rate Limiting**: Max 50 votes per IP address per 24 hours.
- **Soft Reset**: Admin ability to reduce vote counts across the board.

---

## Deployment

### Replit Setup (To Be Completed)
- Create a Node.js project on Replit
- Upload the code to Replit
- Configure environment variables in Replit Secrets
- Run initialization scripts

### Directory Structure
```
ls-tierlist/
├── client/                  # React frontend
│   ├── public/              # Static files
│   └── src/                 # React source code
│       ├── components/      # React components
│       └── App.js           # Main React component
├── db/                      # SQLite database directory
├── server.js                # Express server main file
├── errorHandler.js          # Error handling middleware
├── rateLimit.js             # Rate limiting middleware
├── utils.js                 # Utility functions
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
- ✅ **Testing**: API endpoints and core functionality verified

### Remaining Tasks
- Deploy to Replit or similar hosting service
- Configure automatic restarts if needed
- Set up proper domain (optional)
- Create backup strategy for database

---

## License

MIT