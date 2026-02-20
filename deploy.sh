#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting deployment..."

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Build the project
echo "Building the project..."
npm run build

# Identify the build directory (SvelteKit adapter-static uses 'build', Vite uses 'dist')
if [ -d "build" ]; then
    BUILD_DIR="build"
elif [ -d "dist" ]; then
    BUILD_DIR="dist"
else
    echo "Error: Build directory not found. Expected 'build' or 'dist'."
    exit 1
fi

# 3. Commit build folder files to root directory in gh-pages
echo "Deploying content from $BUILD_DIR to gh-pages branch..."

# Save the remote URL from the root git config
REMOTE_URL=$(git config --get remote.origin.url)

if [ -z "$REMOTE_URL" ]; then
    echo "Error: Could not determine remote origin URL."
    exit 1
fi

# Navigate to the build directory
cd "$BUILD_DIR"

# Initialize a new git repository in the build directory to push just this folder
# We remove any existing .git directory to ensure a fresh init
rm -rf .git
git init
git checkout -b gh-pages

# Add all files
git add -A

# Commit
git commit -m "Deploy to gh-pages"

# Push to the gh-pages branch on the remote, forcing the update
git push -f "$REMOTE_URL" gh-pages

echo "Deployment complete!"