#!/bin/bash

# 전체 Lambda 함수 배포 스크립트
# REST API + WebSocket API 모두 배포

echo "🚀 Deploying all Lambda functions for nx-tt-dev-ver3..."
echo "=============================================="

# REST API 배포
echo "1️⃣ Deploying REST API..."
./deploy-rest-api.sh

if [ $? -ne 0 ]; then
    echo "❌ REST API deployment failed. Stopping deployment."
    exit 1
fi

echo ""
echo "=============================================="

# WebSocket API 배포
echo "2️⃣ Deploying WebSocket API..."
./deploy-websocket-api.sh

if [ $? -ne 0 ]; then
    echo "❌ WebSocket API deployment failed. Stopping deployment."
    exit 1
fi

echo ""
echo "=============================================="
echo "🎉 All deployments completed successfully!"
echo ""
echo "📡 API Endpoints:"
echo "  REST API:      https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com"
echo "  WebSocket API: wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "📋 Lambda Functions:"
echo "  REST API:"
echo "    - nx-tt-dev-ver3-prompt-crud"
echo "  WebSocket API:"
echo "    - nx-tt-dev-ver3-websocket-connect"
echo "    - nx-tt-dev-ver3-websocket-disconnect" 
echo "    - nx-tt-dev-ver3-websocket-message"
echo ""
echo "🗄️  DynamoDB Tables:"
echo "    - nx-tt-dev-ver3-prompts"
echo "    - nx-tt-dev-ver3-files"
echo "    - nx-tt-dev-ver3-websocket-connections"