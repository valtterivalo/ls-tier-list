#!/bin/bash
# Ultra simple build script for Render - Fixed version

set -e  # Exit immediately if a command exits with a non-zero status
set -x  # Print each command before executing (for debugging)

# Root dependencies
echo "=== Installing root dependencies ==="
npm install

# Client dependencies and build
echo "=== Building client ==="
cd client
npm install

# Use the locally installed react-scripts with environment variables
echo "=== Running React build ==="
export CI=false
export NODE_ENV=production

# Call react-scripts directly from node_modules
./node_modules/.bin/react-scripts --version
./node_modules/.bin/react-scripts build

cd ..

# Database setup
echo "=== Setting up database ==="
mkdir -p db
export NODE_ENV=production
node seed-champions.js

echo "=== Build complete! ===" 