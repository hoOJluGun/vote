#!/bin/bash

# Health Check Script for Cognitive Execution Layer (CEL) v4.2.1
# This script verifies the operational status of all key components

echo "🔍 Cognitive Execution Layer (CEL) v4.2.1 - Health Check"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "\n📋 Checking Node.js version..."
NODE_VERSION=$(node -v | sed 's/v//')
MIN_VERSION="20.0.0"

if [[ $(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1) == "$MIN_VERSION" ]]; then
    echo -e "${GREEN}✓ Node.js version $NODE_VERSION meets minimum requirement ($MIN_VERSION)${NC}"
else
    echo -e "${RED}✗ Node.js version $NODE_VERSION is below minimum requirement ($MIN_VERSION)${NC}"
fi

# Check if required files exist
echo -e "\n📁 Checking for essential files..."

FILES=(
    "package.json"
    "src/server/index.js"
    "new-index.js"
    "README.md"
    "PROJECT_STRUCTURE.md"
    "openapi.yaml"
    "lib/formal-safety-model.js"
    "src/providers/provider-factory.js"
    "src/engines/semantic-cache.js"
    "src/engines/rag-engine.js"
    "src/security/keychain-manager.js"
    "xcode/CELClient.swift"
    "xcode/CELXcodeExtension/CELXcodeExtension.swift"
    "cli/enhanced-cli.js"
    "ide/web-ide/src/components/ChatPanel.tsx"
    "ide/web-ide/src/components/Editor.tsx"
)

MISSING_FILES=()
for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓$file${NC}"
    else
        echo -e "  ${RED}✗$file${NC}"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "\n${GREEN}✓ All essential files present${NC}"
else
    echo -e "\n${RED}✗ Missing ${#MISSING_FILES[@]} essential files${NC}"
fi

# Check if required directories exist
echo -e "\n📂 Checking for essential directories..."

DIRECTORIES=(
    "src/engines"
    "src/providers"
    "src/server/routes"
    "lib"
    "xcode"
    "validation"
    "cli"
    "ide/web-ide/src"
    "ide/web-ide/src/components"
    "ide/web-ide/src/stores"
)

MISSING_DIRS=()
for dir in "${DIRECTORIES[@]}"; do
    if [[ -d "$dir" ]]; then
        echo -e "  ${GREEN}✓$dir${NC}"
    else
        echo -e "  ${YELLOW}⚠$dir${NC}"
        MISSING_DIRS+=("$dir")
    fi
done

# Check for dependencies
echo -e "\n📦 Checking dependencies..."

if [[ -d "node_modules" ]]; then
    DEPS_COUNT=$(ls node_modules | wc -l)
    echo -e "${GREEN}✓ node_modules directory exists with $DEPS_COUNT packages${NC}"
else
    echo -e "${RED}✗ node_modules directory missing${NC}"
fi

# Check critical environment variables
echo -e "\n🔐 Checking critical environment variables..."

# Load .env if it exists
if [[ -f ".env" ]]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

CRITICAL_ENV_VARS=(
    "OPENROUTER_API_KEY"
)

OPTIONAL_ENV_VARS=(
    "SEMANTIC_CACHE_SIZE"
    "CONTEXT_WINDOW_SIZE"
    "PROJECT_PATH"
)

# Check critical variables
MISSING_CRITICAL=0
for var in "${CRITICAL_ENV_VARS[@]}"; do
    if [[ ! -z "${!var}" ]]; then
        echo -e "  ${GREEN}✓$var is set${NC}"
    else
        echo -e "  ${RED}✗$var is NOT SET (CRITICAL)${NC}"
        MISSING_CRITICAL=1
    fi
done

# Check optional variables
for var in "${OPTIONAL_ENV_VARS[@]}"; do
    if [[ ! -z "${!var}" ]]; then
        echo -e "  ${GREEN}✓$var is set${NC}"
    else
        echo -e "  ${YELLOW}⚠$var is not set (optional)${NC}"
    fi
done

# Check if .env file exists
if [[ -f ".env" ]]; then
    echo -e "  ${GREEN}✓.env file exists${NC}"
else
    echo -e "  ${YELLOW}⚠.env file does not exist${NC}"
fi

# Check for key components integration
echo -e "\n⚙️  Checking component integration..."

COMPONENTS=(
    "ProviderFactory"
    "SemanticCache"
    "RAG Engine"
    "Keychain Manager"
    "Formal Safety Model"
    "Orchestration Engine"
    "Self-Healing Layer"
    "CLI"
    "Web IDE"
)

for comp in "${COMPONENTS[@]}"; do
    case "$comp" in
        "ProviderFactory")
            SEARCH_TERM="providerFactory"
            ;;
        "SemanticCache")
            SEARCH_TERM="semanticCache"
            ;;
        "RAG Engine")
            SEARCH_TERM="ragEngine"
            ;;
        "Keychain Manager")
            SEARCH_TERM="Keychain"
            ;;
        "Formal Safety Model")
            SEARCH_TERM="formal-safety-model"
            ;;
        "Orchestration Engine")
            SEARCH_TERM="orchestration-engine"
            ;;
        "Self-Healing Layer")
            SEARCH_TERM="self-healing-layer"
            ;;
        "CLI")
            SEARCH_TERM="enhanced-cli.js"
            ;;
        "Web IDE")
            SEARCH_TERM="ChatPanel.tsx"
            ;;
    esac
    
    if [[ "$comp" == "CLI" || "$comp" == "Web IDE" ]]; then
        # Special handling for CLI and Web IDE
        if [[ -f "cli/enhanced-cli.js" && "$comp" == "CLI" ]] || [[ -f "ide/web-ide/src/components/ChatPanel.tsx" && "$comp" == "Web IDE" ]]; then
            echo -e "  ${GREEN}✓$comp available${NC}"
        else
            echo -e "  ${YELLOW}⚠$comp not found${NC}"
        fi
    else
        if grep -q "$SEARCH_TERM" src/server/index.js; then
            echo -e "  ${GREEN}✓$comp integrated${NC}"
        else
            echo -e "  ${YELLOW}⚠$comp not found in main server${NC}"
        fi
    fi
done

# Check for common configuration issues
echo -e "\n🔧 Checking for common configuration issues..."

CONFIG_ISSUES=0
if [[ ! -f ".env" ]]; then
    echo -e "  ${YELLOW}⚠ .env file missing - you may need to create it from .env.example${NC}"
    CONFIG_ISSUES=1
elif [[ ! -s ".env" ]]; then
    echo -e "  ${YELLOW}⚠ .env file is empty${NC}"
    CONFIG_ISSUES=1
fi

# Check if main server files have proper shebang or are executable
if [[ -r "src/server/index.js" ]]; then
    echo -e "  ${GREEN}✓ Main server file readable${NC}"
else
    echo -e "  ${RED}✗ Main server file not readable${NC}"
    CONFIG_ISSUES=1
fi

# Summary
echo -e "\n🏁 Health Check Complete"

if [[ $MISSING_CRITICAL -eq 1 ]]; then
    echo -e "\n${RED}🚨 CRITICAL ISSUE: Some critical environment variables are not set!${NC}"
    echo -e "Please set the missing variables or copy .env.example to .env and update values."
    exit 1
fi

TOTAL_CHECKS=$(( ${#FILES[@]} + ${#DIRECTORIES[@]} + ${#CRITICAL_ENV_VARS[@]} + ${#OPTIONAL_ENV_VARS[@]} + 1 + ${#COMPONENTS[@]} + 1 ))  # env file + config issues
FAILED_CHECKS=$(( ${#MISSING_FILES[@]} + ${#MISSING_DIRS[@]} + MISSING_CRITICAL + CONFIG_ISSUES ))

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All checks passed! CEL v4.2.1 is ready for operation.${NC}"
    echo -e "\nTo start the server, run: npm start"
else
    echo -e "\n${YELLOW}$FAILED_CHECKS checks failed or warned. Review the output above.${NC}"
fi