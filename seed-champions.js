const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Database setup
const dbFile = path.join(__dirname, 'db', 'tierlist.db');
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
        fetchAndSeedChampions();
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

    // For this MVP, we'll assign roles based on a predefined mapping
    // In a real application, you might want to use a more sophisticated approach
    const roleMapping = {
      // Top lane champions
      'Aatrox': ['Top'],
      'Camille': ['Top'],
      'Darius': ['Top'],
      'Fiora': ['Top'],
      'Gangplank': ['Top'],
      'Garen': ['Top'],
      'Gnar': ['Top'],
      'Illaoi': ['Top'],
      'Irelia': ['Top', 'Mid'],
      'Jax': ['Top', 'Jungle'],
      'Jayce': ['Top', 'Mid'],
      'Kayle': ['Top', 'Mid'],
      'Kennen': ['Top'],
      'Kled': ['Top'],
      'Malphite': ['Top', 'Support'],
      'Maokai': ['Top', 'Support', 'Jungle'],
      'Mordekaiser': ['Top'],
      'Nasus': ['Top'],
      'Ornn': ['Top'],
      'Pantheon': ['Top', 'Mid', 'Support'],
      'Poppy': ['Top', 'Jungle'],
      'Quinn': ['Top'],
      'Renekton': ['Top'],
      'Riven': ['Top'],
      'Rumble': ['Top', 'Mid'],
      'Sett': ['Top', 'Support'],
      'Shen': ['Top', 'Support'],
      'Singed': ['Top'],
      'Sion': ['Top'],
      'Teemo': ['Top'],
      'Tryndamere': ['Top'],
      'Urgot': ['Top'],
      'Volibear': ['Top', 'Jungle'],
      'Wukong': ['Top', 'Jungle'],
      'Yorick': ['Top'],
      
      // Jungle champions
      'Amumu': ['Jungle'],
      'Diana': ['Jungle', 'Mid'],
      'Ekko': ['Jungle', 'Mid'],
      'Elise': ['Jungle'],
      'Evelynn': ['Jungle'],
      'Fiddlesticks': ['Jungle'],
      'Gragas': ['Jungle', 'Top'],
      'Graves': ['Jungle'],
      'Hecarim': ['Jungle'],
      'Ivern': ['Jungle'],
      'Jarvan IV': ['Jungle'],
      'Karthus': ['Jungle'],
      'Kayn': ['Jungle'],
      'Khazix': ['Jungle'],
      'Kindred': ['Jungle'],
      'Lee Sin': ['Jungle'],
      'Lillia': ['Jungle', 'Top'],
      'Master Yi': ['Jungle'],
      'Nidalee': ['Jungle'],
      'Nocturne': ['Jungle', 'Mid'],
      'Nunu & Willump': ['Jungle'],
      'Olaf': ['Jungle', 'Top'],
      'Rammus': ['Jungle'],
      'RekSai': ['Jungle'],
      'Rengar': ['Jungle', 'Top'],
      'Sejuani': ['Jungle'],
      'Shaco': ['Jungle', 'Support'],
      'Shyvana': ['Jungle'],
      'Skarner': ['Jungle'],
      'Taliyah': ['Jungle', 'Mid'],
      'Trundle': ['Jungle', 'Top'],
      'Udyr': ['Jungle'],
      'Vi': ['Jungle'],
      'Viego': ['Jungle', 'Mid'],
      'Warwick': ['Jungle', 'Top'],
      'Xin Zhao': ['Jungle'],
      'Zac': ['Jungle'],
      
      // Mid lane champions
      'Ahri': ['Mid'],
      'Akali': ['Mid', 'Top'],
      'Anivia': ['Mid'],
      'Annie': ['Mid', 'Support'],
      'Aurelion Sol': ['Mid'],
      'Azir': ['Mid'],
      'Brand': ['Mid', 'Support'],
      'Cassiopeia': ['Mid'],
      'Corki': ['Mid'],
      'Fizz': ['Mid'],
      'Galio': ['Mid', 'Support'],
      'Heimerdinger': ['Mid', 'Top'],
      'Kassadin': ['Mid'],
      'Katarina': ['Mid'],
      'LeBlanc': ['Mid'],
      'Lissandra': ['Mid'],
      'Lux': ['Mid', 'Support'],
      'Malzahar': ['Mid'],
      'Neeko': ['Mid', 'Support'],
      'Orianna': ['Mid'],
      'Qiyana': ['Mid'],
      'Ryze': ['Mid', 'Top'],
      'Sylas': ['Mid', 'Top'],
      'Syndra': ['Mid'],
      'Talon': ['Mid'],
      'Twisted Fate': ['Mid'],
      'Veigar': ['Mid', 'Support'],
      'Viktor': ['Mid'],
      'Vladimir': ['Mid', 'Top'],
      'Xerath': ['Mid', 'Support'],
      'Yasuo': ['Mid', 'Top'],
      'Yone': ['Mid', 'Top'],
      'Zed': ['Mid'],
      'Ziggs': ['Mid', 'ADC'],
      'Zoe': ['Mid', 'Support'],
      
      // ADC champions
      'Aphelios': ['ADC'],
      'Ashe': ['ADC', 'Support'],
      'Caitlyn': ['ADC'],
      'Draven': ['ADC'],
      'Ezreal': ['ADC'],
      'Jhin': ['ADC'],
      'Jinx': ['ADC'],
      'Kaisa': ['ADC'],
      'Kalista': ['ADC'],
      'Kogmaw': ['ADC'],
      'Lucian': ['ADC', 'Mid'],
      'Miss Fortune': ['ADC', 'Support'],
      'Samira': ['ADC'],
      'Senna': ['ADC', 'Support'],
      'Sivir': ['ADC'],
      'Tristana': ['ADC', 'Mid'],
      'Twitch': ['ADC', 'Jungle'],
      'Varus': ['ADC', 'Mid'],
      'Vayne': ['ADC', 'Top'],
      'Xayah': ['ADC'],
      
      // Support champions
      'Alistar': ['Support'],
      'Bard': ['Support'],
      'Blitzcrank': ['Support'],
      'Braum': ['Support'],
      'Janna': ['Support'],
      'Karma': ['Support', 'Mid'],
      'Leona': ['Support'],
      'Lulu': ['Support'],
      'Morgana': ['Support', 'Mid'],
      'Nami': ['Support'],
      'Nautilus': ['Support'],
      'Pyke': ['Support'],
      'Rakan': ['Support'],
      'Rell': ['Support'],
      'Seraphine': ['Support', 'Mid'],
      'Soraka': ['Support'],
      'Tahm Kench': ['Support', 'Top'],
      'Taric': ['Support'],
      'Thresh': ['Support'],
      'Yuumi': ['Support'],
      'Zilean': ['Support', 'Mid'],
      'Zyra': ['Support', 'Mid']
    };

    // Process each champion
    const champions = Object.values(championsData);
    let insertCount = 0;

    for (const champion of champions) {
      const name = champion.name;
      // Use our predefined roles or default to all roles if not found
      const roles = roleMapping[name] || ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
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
              db.close();
            }
          }
        }
      );
    }
  } catch (error) {
    console.error('Error fetching or seeding champion data:', error);
    db.close();
  }
}

console.log('Starting champion data seeding process...'); 