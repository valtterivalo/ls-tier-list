#!/bin/bash
# Ultra simple build script for Render

set -e  # Exit immediately if a command exits with a non-zero status
set -x  # Print each command before executing (for debugging)

# Install global tools
echo "=== Installing global tools ==="
npm install -g react-scripts

# Root dependencies
echo "=== Installing root dependencies ==="
npm install

# Client dependencies and build
echo "=== Building client ==="
cd client
npm install
NODE_ENV=production CI=false react-scripts build
cd ..

# Database setup
echo "=== Setting up database ==="
mkdir -p db
export NODE_ENV=production
node seed-champions.js

echo "=== Build complete! ===" 