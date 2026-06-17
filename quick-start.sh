#!/bin/bash

# Quick Start Script for JIRA Test Plan Generator
# This script automates the setup process

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   JIRA Test Plan Generator - Quick Start                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js installation
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Check for .env file
echo "🔐 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo ""
    echo "Please copy .env.template to .env:"
    echo "  cp .env.template .env"
    echo ""
    echo "Then edit .env with your credentials:"
    echo "  nano .env"
    echo ""
    echo "Required credentials:"
    echo "  - REACT_APP_JIRA_BASE_URL (e.g., https://company.atlassian.net)"
    echo "  - REACT_APP_JIRA_EMAIL (your JIRA email)"
    echo "  - REACT_APP_JIRA_API_TOKEN (JIRA API token)"
    echo "  - REACT_APP_GROQ_API_KEY (GROQ API key)"
    echo ""
    echo "After configuring .env, run this script again."
    exit 1
else
    echo "✅ .env file found"
fi
echo ""

# Test connectivity
echo "🔗 Testing connectivity (optional)..."
echo "Run: node connectivity-test.js"
echo ""

# Start the app
echo "🚀 Starting JIRA Test Plan Generator..."
echo ""
echo "The app will open at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

npm start
