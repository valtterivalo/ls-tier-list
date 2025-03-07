#!/bin/bash
# Direct build script for Render

set -e  # Exit immediately if a command exits with a non-zero status
set -x  # Print each command before executing (for debugging)

echo "=== Installing root dependencies ==="
npm ci

echo "=== Installing client dependencies ==="
cd client
npm ci

echo "=== Checking for react-scripts ==="
ls -la node_modules/.bin || echo "bin directory not found"
ls -la node_modules/react-scripts || echo "react-scripts not found"

echo "=== Building React app ==="
# Use npx instead of direct path to ensure react-scripts is found
npx react-scripts build
cd ..

echo "=== Setting up database ==="
# Create db directory if it doesn't exist
mkdir -p db

# Set NODE_ENV directly in this script
export NODE_ENV=production

echo "=== Seeding database ==="
node seed-champions.js

echo "=== Build complete! ===" 