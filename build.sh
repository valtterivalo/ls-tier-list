#!/bin/bash
# Direct build script for Render

set -e  # Exit immediately if a command exits with a non-zero status

echo "=== Installing root dependencies ==="
npm ci

echo "=== Installing client dependencies ==="
cd client
npm ci

echo "=== Building React app ==="
# Call react-scripts directly from node_modules to avoid any script recursion
./node_modules/.bin/react-scripts build
cd ..

echo "=== Setting up database ==="
# Create db directory if it doesn't exist
mkdir -p db

# Set NODE_ENV directly in this script
export NODE_ENV=production

echo "=== Seeding database ==="
node seed-champions.js

echo "=== Build complete! ===" 