// Initialization script for Render
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Initializing application for Render deployment');

// Set production environment
process.env.NODE_ENV = 'production';
console.log(`Initializing application in PRODUCTION mode`);

// Create necessary directories
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
  console.log('Created db directory');
}

// Clean up existing database
const dbFileName = 'tierlist-prod.db';
const dbFile = path.join(dbDir, dbFileName);

if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log(`Removed existing database: ${dbFileName}`);
}

// Run seed script to populate database
console.log('Running champion seeding script...');
try {
  execSync('node seed-champions.js', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  console.log('Database seeding completed successfully');
} catch (error) {
  console.error('Database seeding failed:', error);
  process.exit(1);
}

console.log('Initialization completed successfully.');
console.log('The application is ready to run in PRODUCTION mode.');
console.log('Start the server with: npm start'); 