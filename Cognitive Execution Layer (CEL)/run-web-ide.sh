#!/bin/bash

# Script to run the CEL Web IDE

echo "🚀 Starting CEL Web IDE..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -d "ide/web-ide" ]; then
    echo -e "${RED}✗ Error: Cannot find ide/web-ide directory${NC}"
    echo "Please run this script from the root of the CEL project"
    exit 1
fi

# Navigate to the web IDE directory
cd ide/web-ide

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found, installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Start the development server
echo -e "${GREEN}✓ Starting Web IDE...${NC}"
echo -e "${YELLOW}💡 Web IDE will be available at http://localhost:5173${NC}"
echo -e "${YELLOW}🔧 To stop the server, press Ctrl+C${NC}"

npm run dev