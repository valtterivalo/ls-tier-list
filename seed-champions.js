const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('Starting champion data seeding process...');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Seeding database in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Use environment-specific database file
const dbFileName = isProduction ? 'tierlist-prod.db' : 'tierlist-dev.db';
const dbFile = path.join(__dirname, 'db', dbFileName);
console.log(`Using database file: ${dbFile}`);

// Database setup
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
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
    )`, [], (err) => {
      if (err) {
        console.error('Error creating champions table:', err.message);
      } else {
        console.log('Champions table created or already exists.');
        // First clear the champions table to avoid duplication issues
        db.run('DELETE FROM champions', [], (err) => {
          if (err) {
            console.error('Error clearing champions table:', err.message);
          } else {
            console.log('Champions table cleared successfully.');
            fetchAndSeedChampions();
          }
        });
      }
    });
  });
}

// Fetch champion data from Riot's Data Dragon API
async function fetchAndSeedChampions() {
  try {
    // Get the latest version
    const versionResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const latestVersion = versionResponse.data[0];
    console.log(`Using Data Dragon version: ${latestVersion}`);

    // Fetch champion data
    const championsResponse = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const championsData = championsResponse.data.data;

    // Read champion roles from JSON file if it exists, else use default roles
    let championRolesData = {};
    const rolesFilePath = path.join(__dirname, 'champion_roles', 'champion_roles.json');
    
    if (fs.existsSync(rolesFilePath)) {
      console.log('Loading champion roles from champion_roles.json');
      const fileContents = fs.readFileSync(rolesFilePath, 'utf8');
      championRolesData = JSON.parse(fileContents);
      console.log(`Loaded ${Object.keys(championRolesData).length} champions from roles file`);
      
      // Debug: Check some specific champions
      ['Bel\'Veth', 'Sona', 'Lillia', 'Kog\'Maw', 'Milio'].forEach(name => {
        if (championRolesData[name]) {
          console.log(`${name} in JSON: ${championRolesData[name].join(', ')}`);
        } else {
          console.log(`${name} not found in roles JSON`);
        }
      });
    } else {
      console.log(`WARNING: No champion_roles.json found at ${rolesFilePath}`);
      console.log('Using default role assignments for all champions.');
    }

    // Map Riot role names to our format
    const roleMapping = {
      'TOP': 'Top',
      'JUNGLE': 'Jungle',
      'MIDDLE': 'Mid',
      'BOTTOM': 'ADC',
      'UTILITY': 'Support'
    };

    // Process each champion
    const champions = Object.values(championsData);
    let insertCount = 0;

    for (const champion of champions) {
      const name = champion.name;
      
      // Use roles from JSON file if available, otherwise assign all roles
      let roles;
      if (championRolesData[name]) {
        // Map roles from Riot format to our format
        roles = championRolesData[name].map(role => roleMapping[role] || role);
        console.log(`Setting roles for ${name}: ${roles.join(', ')} (from JSON)`);
      } else {
        // Only for champions not in JSON - assign default role based on Riot's tag
        if (champion.tags && champion.tags.length > 0) {
          // Try to guess primary role from champion tags
          const tagToRole = {
            'Fighter': ['Top', 'Jungle'], 
            'Tank': ['Top', 'Support'],
            'Mage': ['Mid', 'Support'],
            'Assassin': ['Mid', 'Jungle'],
            'Marksman': ['ADC'],
            'Support': ['Support']
          };
          
          const primaryTag = champion.tags[0];
          roles = tagToRole[primaryTag] || ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
          console.log(`${name} not in JSON. Guessing role from tag ${primaryTag}: ${roles.join(', ')}`);
        } else {
          // Fallback if no tags
          roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
          console.log(`${name} not in JSON and no tags. Assigning all roles.`);
        }
      }
      
      const portraitUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`;

      // Insert champion into database
      db.run(
        'INSERT OR REPLACE INTO champions (name, roles, portrait_url) VALUES (?, ?, ?)',
        [name, roles.join(','), portraitUrl],
        function(err) {
          if (err) {
            console.error(`Error inserting champion ${name}:`, err.message);
          } else {
            insertCount++;
            console.log(`Inserted champion: ${name} with roles: ${roles.join(', ')}`);
            
            // Check if all champions have been processed
            if (insertCount === champions.length) {
              console.log('All champions have been seeded successfully!');
              console.log('Running a check for specific champions:');
              
              // Verify insertion of specific champions
              db.all('SELECT name, roles FROM champions WHERE name IN (?, ?, ?, ?, ?)', 
                ['Bel\'Veth', 'Sona', 'Lillia', 'Kog\'Maw', 'Milio'], 
                (err, rows) => {
                  if (err) {
                    console.error('Error checking champions:', err);
                  } else {
                    rows.forEach(row => {
                      console.log(`DB check: ${row.name} has roles: ${row.roles}`);
                    });
                  }
                  db.close();
                }
              );
            }
          }
        }
      );
    }
  } catch (error) {
    console.error('Error fetching or seeding champion data:', error);
    process.exit(1);
  }
}

console.log('Starting champion data seeding process...'); 