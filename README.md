# League of Legends Community Tier List

A minimalist, community-driven tier list for League of Legends champions, split by role, with up/down voting and admin controls.

## Features

- **Five Role-Based Tier Lists**: Top, Jungle, Mid, ADC, and Support
- **Community Voting**: Users can vote champions up or down once per role
- **Tier System**: Champions are ranked into tiers (God, S, A, B, C, D, F, Shit) based on normalized community votes
- **Admin Panel**: Manage champions, roles, and perform maintenance tasks

## How It Works

### Voting System
Users can vote once per champion per role (up or down). Votes are tracked via browser cookies (UUID stored client-side) to prevent duplicate voting from the same user.

### Tier Assignment Algorithm
Champions are assigned to tiers based on their normalized scores:

1. For each champion in a role:
   - Calculate `total_votes = upvotes + downvotes`
   - Calculate `score = upvotes / total_votes` (percent positive, range 0 to 1)
   - For champions with few votes, a Bayesian adjustment is applied to avoid bias

2. Champions are sorted by their scores and assigned to tiers according to these percentages:
   - God Tier: Top 1%
   - S Tier: Next 4%
   - A Tier: Next 15%
   - B Tier: Next 20%
   - C Tier: Next 20%
   - D Tier: Next 15%
   - F Tier: Next 4%
   - Shit Tier: Bottom 1%

3. Rounding is applied to ensure a whole number of champions per tier, with adjustments to middle tiers as needed.

### Daily Snapshots
The system automatically creates daily snapshots of the voting data, which can be restored by admins if needed.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: SQLite
- **External API**: Riot Data Dragon for champion data

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ls-tierlist.git
   cd ls-tierlist
   ```

2. Install server dependencies:
   ```
   npm install
   ```

3. Install client dependencies:
   ```
   npm run install-client
   ```

4. Create a `.env` file in the root directory with the following content:
   ```
   ADMIN_PASSWORD=your_admin_password
   PORT=5000
   ```

5. Seed the database with champion data:
   ```
   npm run seed
   ```

### Running the Application

1. For development (running both server and client concurrently):
   ```
   npm run dev
   ```

2. For production:
   ```
   npm run build
   npm start
   ```

## Usage

- **Viewing Tier Lists**: Navigate to the respective role pages (Top, Jungle, Mid, ADC, Support)
- **Voting**: Click the up or down arrows on champion cards to cast your vote
- **Admin Panel**: Access the admin panel at `/admin` and enter the password set in your `.env` file

## Admin Features

- **Soft Reset**: Reduce all vote counts by a configurable percentage
- **Modify Roles**: Add or remove roles for champions
- **Snapshots**: Create and restore snapshots of the current state

## License

MIT

## Acknowledgements

- Riot Games for League of Legends and the Data Dragon API
- The League of Legends community for inspiration 