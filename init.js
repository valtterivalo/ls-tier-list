const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Initializing application in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// Create necessary directories
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
  console.log('Created db directory');
}

// Clean up existing database if requested
if (process.argv.includes('--clean')) {
  const dbFileName = isProduction ? 'tierlist-prod.db' : 'tierlist-dev.db';
  const dbFile = path.join(dbDir, dbFileName);
  
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
    console.log(`Removed existing database: ${dbFileName}`);
  }
}

// Run seed script to populate database
console.log('Running champion seeding script...');
try {
  execSync('node seed-champions.js', { stdio: 'inherit' });
  console.log('Database seeding completed successfully');
} catch (error) {
  console.error('Database seeding failed:', error);
  process.exit(1);
}

console.log('Initialization completed successfully.');
console.log(`The application is ready to run in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode.`);
console.log('Start the server with: npm start'); 