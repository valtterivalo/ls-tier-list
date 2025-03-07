const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Ensure the db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  console.log('Creating database directory...');
  fs.mkdirSync(dbDir);
}

// Check if .env file exists, create one if it doesn't
const envFile = path.join(__dirname, '.env');
if (!fs.existsSync(envFile)) {
  console.log('Creating default .env file...');
  fs.writeFileSync(envFile, 'ADMIN_PASSWORD=admin123\nPORT=5000');
}

// Run seed-champions.js to populate the database
console.log('Seeding database with champion data...');
const seed = spawn('node', ['seed-champions.js'], { stdio: 'inherit' });

seed.on('close', (code) => {
  if (code !== 0) {
    console.error('Error seeding database');
    process.exit(1);
  }
  
  console.log('\nDatabase setup complete!');
  console.log('\nYou can now run the application with:');
  console.log('  npm run dev    - Development mode with live reloading');
  console.log('  npm start      - Production mode\n');
}); 