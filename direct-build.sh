#!/bin/bash
# Direct, no-frills build script for Render

# Exit on error
set -e
# Show commands being run
set -x

echo "=== Installing server dependencies ==="
npm install

echo "=== Installing client dependencies ==="
cd client
npm install

echo "=== Checking package.json location ==="
pwd
ls -la package.json

echo "=== Checking react-scripts location ==="
ls -la node_modules/.bin/react-scripts || echo "Path not found"

echo "=== Building React app manually ==="
# Build with explicit environment variables
export CI=false
export NODE_ENV=production
# Try both ways to call react-scripts
if [ -f "node_modules/.bin/react-scripts" ]; then
  node_modules/.bin/react-scripts build
else
  # Fallback to npx
  npx --no-install react-scripts build
fi

cd ..

echo "=== Setting up database ==="
mkdir -p db
export NODE_ENV=production
node seed-champions.js

echo "=== Build complete! ===" 