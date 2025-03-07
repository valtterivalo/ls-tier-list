# League of Legends Community Tier List - Project Summary

## Project Overview
This application allows League of Legends players to vote on champions across different roles, creating community-driven tier lists. Champions are categorized into tiers based on their vote scores, with adjustments to ensure fairness for champions with fewer votes.

## Key Features Implemented

### Backend (Node.js/Express)
- RESTful API for champions, voting, and tier lists
- SQLite database for storing champions, votes, and snapshots
- Bayesian score adjustment for balanced tier rankings
- Role-based tier list organization (Top, Jungle, Mid, ADC, Support)
- Admin controls for champion role management and vote resets
- Automatic daily snapshots for data backups
- Rate limiting to prevent abuse

### Frontend (React)
- Responsive design with mobile support
- Role-based navigation
- Visual tier list display with champion portraits
- Up/down voting system with user tracking via cookies
- Admin panel for maintenance tasks

## Architecture
- **Client-Server Model**: React frontend communicating with Express backend
- **Database**: SQLite for lightweight, file-based data storage
- **State Management**: React hooks for component state
- **Authentication**: Simple password-based admin access

## Technical Implementation Details

### Voting System
- Each user (identified by browser cookie) can vote once per champion per role
- Votes can be changed by clicking the same button again
- Rate limiting prevents vote spamming

### Tier Assignment Algorithm
1. Collects votes for each champion in a specific role
2. Applies Bayesian adjustment to normalize scores for champions with few votes
3. Ranks champions by adjusted score
4. Assigns to tiers according to percentage distribution:
   - God (top 1%), S (4%), A (15%), B (20%), C (20%), D (15%), F (4%), Shit (bottom 1%)

### Data Recovery
- Automatic daily snapshots
- On-demand snapshots via admin panel
- Ability to restore from any saved snapshot

## Deployment Instructions
The application can be deployed on any Node.js hosting environment:

1. Clone the repository
2. Install dependencies: `npm install && npm run install-client`
3. Initialize the database: `npm run init`
4. Start the application: `npm start`

For development mode with live reloading:
```
npm run dev
```

## Future Enhancements
Potential improvements for future versions:

1. **User Authentication**: Allow user accounts for more persistent voting and anti-abuse measures
2. **Champion Statistics**: Show additional stats like win rates, ban rates from Riot's API
3. **Trend Tracking**: Show how champions move up/down tiers over time
4. **Patch Notes Integration**: Auto-flag champions affected by recent patches
5. **Community Comments**: Allow discussion on specific champions

## Conclusion
This application provides a simple but effective way for the League of Legends community to create and maintain tier lists based on collective opinion. The implementation focuses on fairness through statistical adjustments and ease of use through a clean UI. 