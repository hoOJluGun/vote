#!/bin/bash

# Ukraine Children Voting System - Lightsail Deployment Script

echo "🚀 Ukraine Children Voting System - Amazon Lightsail Deployment"
echo "=========================================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please configure your AWS credentials:"
    echo "   aws configure"
    exit 1
fi

echo "✅ AWS CLI is configured"
echo ""

# Ask for user input
read -p "Enter main instance name (default: vote-main): " MAIN_INSTANCE_NAME
MAIN_INSTANCE_NAME=${MAIN_INSTANCE_NAME:-vote-main}

read -p "Enter bot instance name (default: vote-bot): " BOT_INSTANCE_NAME
BOT_INSTANCE_NAME=${BOT_INSTANCE_NAME:-vote-bot}

read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Enter Telegram Bot Token: " TELEGRAM_BOT_TOKEN

echo ""
echo "Creating Lightsail instances..."
echo "=============================="

# Create main application instance
echo "Creating main application instance: $MAIN_INSTANCE_NAME"
aws lightsail create-instances \
    --instance-names $MAIN_INSTANCE_NAME \
    --availability-zone "${AWS_REGION}a" \
    --blueprint-id nodejs \
    --bundle-id nano_2_0 \
    --region $AWS_REGION

# Create bot instance
echo "Creating bot instance: $BOT_INSTANCE_NAME"
aws lightsail create-instances \
    --instance-names $BOT_INSTANCE_NAME \
    --availability-zone "${AWS_REGION}a" \
    --blueprint-id nodejs \
    --bundle-id nano_2_0 \
    --region $AWS_REGION

echo ""
echo "✅ Instances creation initiated!"
echo "   Main instance: $MAIN_INSTANCE_NAME"
echo "   Bot instance: $BOT_INSTANCE_NAME"
echo ""
echo "Next steps:"
echo "1. Wait for instances to be ready (check in AWS Lightsail console)"
echo "2. Connect to instances via SSH"
echo "3. Deploy application code"
echo "4. Set up environment variables"
echo "5. Start services"
echo ""
echo "For detailed instructions, see LIGHTSAIL_DEPLOYMENT.md"