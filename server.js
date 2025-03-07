const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();
const rateLimit = require('./rateLimit');
const errorHandler = require('./errorHandler');
const { applyBayesianAdjustment, assignTiersToChampions } = require('./utils');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbFile = path.join(__dirname, 'db', 'tierlist.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// Create database tables if they don't exist
function createTables() {
  db.serialize(() => {
    // Champions table
    db.run(`CREATE TABLE IF NOT EXISTS champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      roles TEXT NOT NULL,
      portrait_url TEXT NOT NULL
    )`);

    // Votes table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      champion_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      user_cookie TEXT NOT NULL,
      vote INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (champion_id) REFERENCES champions(id),
      UNIQUE (champion_id, role, user_cookie)
    )`);

    // Snapshots table
    db.run(`CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database tables created or already exist.');
  });
}

// Routes
// Champions Route
app.get('/api/champions', (req, res) => {
  db.all('SELECT * FROM champions', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Voting Route - Apply rate limiting
app.post('/api/vote', rateLimit(50), (req, res) => {
  const { champion_id, role, user_cookie, vote } = req.body;
  
  if (!champion_id || !role || !user_cookie || ![-1, 1].includes(vote)) {
    return res.status(400).json({ error: 'Invalid vote data' });
  }

  // Check if the user has already voted for this champion in this role
  db.get('SELECT * FROM votes WHERE champion_id = ? AND role = ? AND user_cookie = ?', 
    [champion_id, role, user_cookie], 
    (err, existingVote) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingVote) {
        // Update existing vote
        db.run('UPDATE votes SET vote = ? WHERE id = ?', 
          [vote, existingVote.id], 
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Vote updated successfully' });
          });
      } else {
        // Insert new vote
        db.run('INSERT INTO votes (champion_id, role, user_cookie, vote) VALUES (?, ?, ?, ?)', 
          [champion_id, role, user_cookie, vote], 
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Vote recorded successfully' });
          });
      }
    });
});

// Tier List Route
app.get('/api/tiers/:role', (req, res) => {
  const { role } = req.params;
  const validRoles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
  
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  // Get all champions for this role with their votes
  db.all(`
    SELECT c.id, c.name, c.portrait_url, 
           SUM(CASE WHEN v.vote = 1 THEN 1 ELSE 0 END) as upvotes,
           SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END) as downvotes,
           COUNT(v.id) as total_votes
    FROM champions c
    LEFT JOIN votes v ON c.id = v.champion_id AND v.role = ?
    WHERE c.roles LIKE ?
    GROUP BY c.id
  `, [role, `%${role}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Apply Bayesian adjustment to the scores
    const adjustedChampions = applyBayesianAdjustment(rows);
    
    // Assign champions to tiers based on adjusted scores
    const tieredChampions = assignTiersToChampions(adjustedChampions);
    
    res.json(tieredChampions);
  });
});

// Admin Routes
app.post('/api/admin/soft-reset', (req, res) => {
  const { percentage, password } = req.body;
  
  // Simple authentication for MVP
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate percentage
  if (!percentage || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: 'Invalid percentage value' });
  }

  // Create a snapshot before reset
  createSnapshot(`pre-reset-${new Date().toISOString()}`);

  // Apply soft reset
  db.run('UPDATE votes SET vote = ROUND(vote * (1 - ? / 100))', 
    [percentage], 
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: `Soft reset applied with ${percentage}% reduction` });
    });
});

// Get all snapshots
app.get('/api/admin/snapshots', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  db.all('SELECT id, name, created_at FROM snapshots ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create a new snapshot
app.post('/api/admin/snapshots', (req, res) => {
  const { name, password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  createSnapshot(name);
  res.json({ message: 'Snapshot created successfully' });
});

// Restore from a snapshot
app.post('/api/admin/restore', (req, res) => {
  const { snapshot_id, password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get the snapshot data
  db.get('SELECT data FROM snapshots WHERE id = ?', [snapshot_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    
    // Create a backup before restore
    createSnapshot(`pre-restore-${new Date().toISOString()}`);
    
    // Parse the snapshot data
    const votes = JSON.parse(row.data);
    
    // Begin a transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Clear existing votes
      db.run('DELETE FROM votes', [], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        // Insert votes from snapshot
        const stmt = db.prepare('INSERT INTO votes (champion_id, role, user_cookie, vote, timestamp) VALUES (?, ?, ?, ?, ?)');
        
        votes.forEach(vote => {
          stmt.run(vote.champion_id, vote.role, vote.user_cookie, vote.vote, vote.timestamp);
        });
        
        stmt.finalize();
        
        db.run('COMMIT', function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'Snapshot restored successfully' });
        });
      });
    });
  });
});

// Update champion roles
app.put('/api/admin/champions/:id/roles', (req, res) => {
  const { id } = req.params;
  const { roles, password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Invalid roles data' });
  }
  
  const rolesString = roles.join(',');
  
  db.run('UPDATE champions SET roles = ? WHERE id = ?', [rolesString, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Champion not found' });
    }
    
    res.json({ message: 'Champion roles updated successfully' });
  });
});

// Create database snapshot
function createSnapshot(name) {
  db.all('SELECT * FROM votes', [], (err, votes) => {
    if (err) {
      console.error('Error creating snapshot:', err.message);
      return;
    }
    
    const data = JSON.stringify(votes);
    db.run('INSERT INTO snapshots (name, data) VALUES (?, ?)', 
      [name, data], 
      function(err) {
        if (err) {
          console.error('Error saving snapshot:', err.message);
        } else {
          console.log(`Snapshot "${name}" created successfully`);
        }
      });
  });
}

// Set up daily automatic snapshots
const setupDailySnapshot = () => {
  // Create initial snapshot when server starts
  createSnapshot(`auto-initial-${new Date().toISOString()}`);
  
  // Calculate time until midnight
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0, 0, 0 // midnight
  );
  const msUntilMidnight = night.getTime() - now.getTime();
  
  // Schedule first snapshot at midnight
  setTimeout(() => {
    createSnapshot(`auto-daily-${new Date().toISOString()}`);
    
    // Then set up daily interval (24 hours)
    setInterval(() => {
      createSnapshot(`auto-daily-${new Date().toISOString()}`);
    }, 24 * 60 * 60 * 1000);
    
  }, msUntilMidnight);
  
  console.log(`Scheduled daily snapshots. First snapshot in ${Math.round(msUntilMidnight / (1000 * 60 * 60))} hours.`);
};

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setupDailySnapshot();
}); 