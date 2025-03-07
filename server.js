const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();

// Update paths to match the new directory structure
const rateLimit = require('./server/middleware/rateLimit.js');
const errorHandler = require('./server/middleware/errorHandler.js');
const { applyBayesianAdjustment, assignTiersToChampions } = require('./server/utils/utils.js');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Use different database files for development and production
const dbFileName = isProduction ? 'tierlist-prod.db' : 'tierlist-dev.db';
console.log(`Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode with database: ${dbFileName}`);

const dbFile = path.join(__dirname, 'db', dbFileName);
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

// Update all champion roles from champion_roles.json file
app.post('/api/admin/update-champion-roles', (req, res) => {
  const { password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Read champion roles from JSON file
    const rolesFilePath = path.join(__dirname, 'champion_roles', 'champion_roles.json');
    console.log(`Reading champion roles from: ${rolesFilePath}`);
    
    if (!fs.existsSync(rolesFilePath)) {
      console.error('Champion roles file not found!');
      return res.status(404).json({ error: 'Champion roles file not found' });
    }
    
    const championRolesData = JSON.parse(fs.readFileSync(rolesFilePath, 'utf8'));
    console.log(`Loaded ${Object.keys(championRolesData).length} champions from roles file`);
    
    // Map role names from Riot format to our format
    const roleMapping = {
      'TOP': 'Top',
      'JUNGLE': 'Jungle',
      'MIDDLE': 'Mid',
      'BOTTOM': 'ADC',
      'UTILITY': 'Support'
    };

    // Get all champions from database
    db.all('SELECT * FROM champions', [], async (err, champions) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`Found ${champions.length} champions in database`);

      // Track updates, additions, and removals
      const stats = {
        updated: 0,
        added: 0,
        removed: 0
      };

      // Convert champions array to map for easier lookup
      const championsMap = {};
      champions.forEach(champ => {
        championsMap[champ.name] = champ;
      });

      // Debug: Check a few specific champions
      const checkChampions = ['Bel\'Veth', 'Sona', 'Lillia', 'Kog\'Maw', 'Milio'];
      checkChampions.forEach(name => {
        if (championRolesData[name]) {
          console.log(`${name} in JSON: ${championRolesData[name].join(', ')}`);
        } else {
          console.log(`${name} not found in JSON`);
        }
        
        if (championsMap[name]) {
          console.log(`${name} in DB: ${championsMap[name].roles}`);
        } else {
          console.log(`${name} not found in DB`);
        }
      });

      // Start a transaction
      db.run('BEGIN TRANSACTION', async (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Process each champion from JSON file
        for (const [championName, rolesArray] of Object.entries(championRolesData)) {
          // Map roles to our format
          const mappedRoles = rolesArray.map(role => roleMapping[role] || role);
          const rolesString = mappedRoles.join(',');

          if (championsMap[championName]) {
            // Update existing champion
            await new Promise((resolve, reject) => {
              db.run(
                'UPDATE champions SET roles = ? WHERE id = ?',
                [rolesString, championsMap[championName].id],
                function(err) {
                  if (err) {
                    console.error(`Error updating ${championName}:`, err.message);
                    reject(err);
                  } else {
                    if (this.changes > 0) {
                      console.log(`Updated ${championName} roles to: ${rolesString}`);
                      stats.updated++;
                    }
                    resolve();
                  }
                }
              );
            }).catch(err => {
              throw err;
            });
          } else {
            // Add new champion with default portrait URL
            const portraitUrl = `https://ddragon.leagueoflegends.com/cdn/latest/img/champion/${championName.replace(/\s/g, '')}.png`;
            
            await new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO champions (name, roles, portrait_url) VALUES (?, ?, ?)',
                [championName, rolesString, portraitUrl],
                function(err) {
                  if (err) {
                    console.error(`Error adding ${championName}:`, err.message);
                    reject(err);
                  } else {
                    console.log(`Added new champion: ${championName} with roles: ${rolesString}`);
                    stats.added++;
                    resolve();
                  }
                }
              );
            }).catch(err => {
              throw err;
            });
          }
        }

        // Check for champions that are no longer in any role
        for (const champion of champions) {
          if (!championRolesData[champion.name]) {
            // Champion no longer exists in roles file
            stats.removed++;
            console.log(`${champion.name} not found in roles file, clearing roles`);
            
            await new Promise((resolve, reject) => {
              db.run('UPDATE champions SET roles = ? WHERE id = ?', ['', champion.id], function(err) {
                if (err) reject(err);
                else resolve();
              });
            }).catch(err => {
              throw err;
            });
          }
        }

        // Commit the transaction
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          console.log('Champion roles update completed successfully');
          console.log(`Stats: Updated=${stats.updated}, Added=${stats.added}, Removed=${stats.removed}`);
          
          res.json({ 
            message: 'Champion roles updated successfully', 
            stats 
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in update-champion-roles:', error.message);
    db.run('ROLLBACK', () => {
      res.status(500).json({ error: error.message });
    });
  }
});

// Simulate votes for testing
app.post('/api/admin/simulate-votes', (req, res) => {
  const { password, count = 500, roleFilter, bias = [] } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!count || count <= 0 || count > 10000) {
    return res.status(400).json({ error: 'Vote count must be between 1 and 10000' });
  }
  
  // Get all champions, filtered by role if specified
  let query = 'SELECT * FROM champions';
  let params = [];
  
  if (roleFilter) {
    query += ' WHERE roles LIKE ?';
    params.push(`%${roleFilter}%`);
  }
  
  db.all(query, params, async (err, champions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (champions.length === 0) {
      return res.status(404).json({ error: 'No champions found with the specified criteria' });
    }
    
    // Generate random user cookies for vote simulation
    const generateUserCookie = () => {
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    };
    
    // Start a transaction for faster inserts
    db.run('BEGIN TRANSACTION', async (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const voteCounts = {
        upvotes: 0,
        downvotes: 0,
        total: 0
      };
      
      try {
        // Create a biased selection function that favors certain champions if specified
        const biasedChampionSelection = () => {
          // If bias list is empty, just return a random champion
          if (!bias.length) {
            return champions[Math.floor(Math.random() * champions.length)];
          }
          
          // With 30% probability, pick from the biased list if it contains champions
          if (Math.random() < 0.3) {
            const biasedChampions = champions.filter(c => bias.includes(c.name));
            if (biasedChampions.length > 0) {
              return biasedChampions[Math.floor(Math.random() * biasedChampions.length)];
            }
          }
          
          // Otherwise, pick a random champion
          return champions[Math.floor(Math.random() * champions.length)];
        };
        
        // Generate random votes
        for (let i = 0; i < count; i++) {
          const champion = biasedChampionSelection();
          const rolesList = champion.roles.split(',');
          const role = rolesList[Math.floor(Math.random() * rolesList.length)];
          const userCookie = generateUserCookie();
          const vote = Math.random() > 0.35 ? 1 : -1; // 65% upvotes, 35% downvotes
          
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO votes (champion_id, role, user_cookie, vote) VALUES (?, ?, ?, ?)',
              [champion.id, role, userCookie, vote],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  // Count the votes
                  voteCounts.total++;
                  if (vote === 1) voteCounts.upvotes++;
                  else voteCounts.downvotes++;
                  resolve();
                }
              }
            );
          }).catch(err => {
            throw err;
          });
        }
        
        // Commit the transaction
        db.run('COMMIT', (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            message: `Successfully simulated ${count} votes`,
            stats: voteCounts
          });
        });
      } catch (error) {
        db.run('ROLLBACK', () => {
          res.status(500).json({ error: error.message });
        });
      }
    });
  });
});

// Add testing endpoint to verify tier distributions
app.get('/api/admin/verify-tiers', async (req, res) => {
  const { password, role = 'Top' } = req.query;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get all champions for the specified role
  db.all('SELECT * FROM champions WHERE roles LIKE ?', [`%${role}%`], (err, champions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (champions.length === 0) {
      return res.status(404).json({ error: `No champions found for role: ${role}` });
    }
    
    // Get votes for these champions in this role
    const champIds = champions.map(c => c.id);
    const placeholders = champIds.map(() => '?').join(',');
    
    db.all(
      `SELECT champion_id, vote FROM votes WHERE champion_id IN (${placeholders}) AND role = ?`,
      [...champIds, role],
      (err, votes) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Group votes by champion
        const votesByChampion = {};
        votes.forEach(vote => {
          if (!votesByChampion[vote.champion_id]) {
            votesByChampion[vote.champion_id] = { upvotes: 0, downvotes: 0 };
          }
          
          if (vote.vote === 1) {
            votesByChampion[vote.champion_id].upvotes++;
          } else {
            votesByChampion[vote.champion_id].downvotes++;
          }
        });
        
        // Prepare champions with vote data
        const championsWithVotes = champions.map(champ => {
          const voteData = votesByChampion[champ.id] || { upvotes: 0, downvotes: 0 };
          return {
            ...champ,
            upvotes: voteData.upvotes,
            downvotes: voteData.downvotes,
            totalVotes: voteData.upvotes + voteData.downvotes
          };
        });
        
        // Apply Bayesian adjustment and assign tiers
        const adjustedChampions = applyBayesianAdjustment(championsWithVotes);
        const tieredChampions = assignTiersToChampions(adjustedChampions);
        
        // Count champions in each tier
        const tierCounts = {
          'God': 0, 'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0, 'Shit': 0
        };
        
        tieredChampions.forEach(champ => {
          tierCounts[champ.tier]++;
        });
        
        // Calculate expected tier counts based on percentages
        const expectedTierCounts = {
          'God': Math.ceil(champions.length * 0.01),
          'S': Math.ceil(champions.length * 0.04),
          'A': Math.ceil(champions.length * 0.15),
          'B': Math.ceil(champions.length * 0.20),
          'C': Math.ceil(champions.length * 0.20),
          'D': Math.ceil(champions.length * 0.15),
          'F': Math.ceil(champions.length * 0.04),
          'Shit': Math.ceil(champions.length * 0.01)
        };
        
        res.json({
          role,
          championCount: champions.length,
          voteCount: votes.length,
          tierDistribution: tierCounts,
          expectedDistribution: expectedTierCounts,
          champions: tieredChampions.map(c => ({
            name: c.name,
            tier: c.tier,
            upvotes: c.upvotes,
            downvotes: c.downvotes,
            totalVotes: c.totalVotes,
            adjustedScore: c.adjustedScore
          }))
        });
      }
    );
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Check if DB is accessible
  db.get('SELECT COUNT(*) as count FROM champions', [], (err, row) => {
    if (err) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: err.message
      });
    }
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      database: {
        champions: row.count,
        connected: true
      }
    });
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

// Serve static assets if in production
if (isProduction) {
  // Set static folder
  app.use(express.static(path.join(__dirname, 'client/build')));

  // Any routes not caught by API will load the React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
  
  console.log('Serving React production build');
}

// Error handling middleware should be after routes but before 404 handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode on port ${PORT}`);
  console.log(`Admin panel available at ${isProduction ? 'your-domain.com' : 'http://localhost:' + PORT}/admin`);
  
  // Start daily snapshots
  setupDailySnapshot();
});