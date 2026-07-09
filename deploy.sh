#!/bin/bash

# Exit immediately if any command fails
set -e

echo "=================================================="
echo "🚀 AUTO-SMART ERP & CRM - DOCKER DEPLOYMENT 🚀"
echo "=================================================="

echo "📥 Step 1: Pulling latest changes from Git..."
git pull

echo "🐳 Step 2: Rebuilding and restarting Docker containers..."
# Rebuild the next.js app image and restart all services (app + db) in detached mode
docker compose up -d --build

echo "=================================================="
echo "🎉 DOCKER DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
echo "=================================================="
