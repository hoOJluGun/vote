#!/bin/bash

# Cognitive Execution Layer (CEL) Startup Script
# This script helps initialize and start the CEL system with proper configuration

echo "🚀 Starting Cognitive Execution Layer (CEL) v4.2.1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is available
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed or not in PATH${NC}"
    echo "Please install Node.js version 20.0.0 or higher"
    exit 1
else
    NODE_VERSION=$(node -v | sed 's/v//')
    MIN_VERSION="20.0.0"
    if [[ $(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1) == "$MIN_VERSION" ]]; then
        echo -e "${GREEN}✓ Node.js $NODE_VERSION is available${NC}"
    else
        echo -e "${RED}✗ Node.js $NODE_VERSION is below minimum requirement ($MIN_VERSION)${NC}"
        exit 1
    fi
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed or not in PATH${NC}"
    exit 1
else
    echo -e "${GREEN}✓ npm is available${NC}"
fi

# Check for package.json
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}✗ package.json not found in current directory${NC}"
    exit 1
else
    echo -e "${GREEN}✓ package.json found${NC}"
fi

# Check for .env file
if [[ ! -f ".env" ]]; then
    echo -e "\n${YELLOW}⚠ .env file not found${NC}"
    echo -e "${BLUE}Creating .env from .env.example...${NC}"
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}📝 Please update .env with your actual API keys and settings${NC}"
    else
        echo -e "${RED}✗ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check for critical environment variables
echo -e "\n${BLUE}🔐 Checking environment variables...${NC}"

# Source the environment
set -a
source .env
set +a

MISSING_VARS=()
if [[ -z "$OPENROUTER_API_KEY" || "$OPENROUTER_API_KEY" == "your_openrouter_api_key_here" ]]; then
    MISSING_VARS+=("OPENROUTER_API_KEY")
    echo -e "${RED}✗ OPENROUTER_API_KEY is not properly set${NC}"
    echo -e "  Get your API key from https://openrouter.ai/keys"
else
    echo -e "${GREEN}✓ OPENROUTER_API_KEY is set${NC}"
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "\n${RED}🚨 CRITICAL ERROR: Required environment variables are not set:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo -e "\n${YELLOW}Please update your .env file with the required values.${NC}"
    exit 1
fi

# Check for node_modules
echo -e "\n${BLUE}📦 Checking dependencies...${NC}"
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}⚠ node_modules directory not found${NC}"
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check for Python and stats_engine
if [[ -d "stats_engine" ]]; then
    echo -e "\n${BLUE}🐍 Checking Python dependencies...${NC}"
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}✓ Python 3 is available${NC}"
        
        # Check if requirements.txt exists in stats_engine
        if [[ -f "stats_engine/requirements.txt" ]]; then
            echo -e "${BLUE}Installing Python dependencies...${NC}"
            cd stats_engine
            pip3 install -r requirements.txt
            cd ..
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Python dependencies installed${NC}"
            else
                echo -e "${YELLOW}⚠ Could not install Python dependencies (this may be OK if using system Python packages)${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ stats_engine/requirements.txt not found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Python 3 not found - stats_engine may not work${NC}"
    fi
fi

# Final check before starting
echo -e "\n${BLUE}🔍 Performing final checks...${NC}"

# Check if main server files exist
if [[ ! -f "src/server/index.js" ]]; then
    echo -e "${RED}✗ Main server file src/server/index.js not found${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Main server file exists${NC}"
fi

if [[ ! -f "new-index.js" ]]; then
    echo -e "${RED}✗ Alternative server file new-index.js not found${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Alternative server file exists${NC}"
fi

echo -e "\n${GREEN}🎉 All checks passed! Starting CEL server...${NC}"

# Start the server
echo -e "\n${BLUE}🚀 Launching Cognitive Execution Layer...${NC}"
echo -e "${YELLOW}💡 Server will be available at http://127.0.0.1:3000${NC}"
echo -e "${YELLOW}🔧 To stop the server, press Ctrl+C${NC}"

# Start the main server
npm start