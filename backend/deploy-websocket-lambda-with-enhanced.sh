#!/bin/bash

# WebSocket Lambda 함수 배포 스크립트 (향상된 프롬프트 엔지니어링 포함)

FUNCTION_NAME="nx-tt-dev-ver3-websocket-message"
REGION="us-east-1"
RUNTIME="python3.9"
DEPLOYMENT_DIR="lambda/deployments/websocket"

echo "🚀 Starting Lambda deployment with enhanced prompt engineering"

# 1. 배포 디렉토리 생성
echo "1. Creating deployment directory..."
rm -rf $DEPLOYMENT_DIR
mkdir -p $DEPLOYMENT_DIR

# 2. 파일 복사
echo "2. Copying files..."
cp lambda/websocket/websocket_message_handler.py $DEPLOYMENT_DIR/lambda_function.py
cp lambda/websocket/conversation_manager.py $DEPLOYMENT_DIR/

# shared 폴더 생성 및 파일 복사
mkdir -p $DEPLOYMENT_DIR/shared
cp lambda/shared/bedrock_client.py $DEPLOYMENT_DIR/shared/
cp lambda/shared/bedrock_client_enhanced.py $DEPLOYMENT_DIR/shared/

# 3. ZIP 파일 생성
echo "3. Creating deployment package..."
cd $DEPLOYMENT_DIR
zip -r ../websocket_handler_enhanced.zip . -x "*.pyc" -x "__pycache__/*"
cd ../../..

# 4. Lambda 함수 업데이트
echo "4. Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda/deployments/websocket_handler_enhanced.zip \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Lambda function code updated successfully"
else
    echo "❌ Failed to update Lambda function"
    exit 1
fi

# 5. 함수 설정 업데이트 (필요시)
echo "5. Updating function configuration..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --timeout 60 \
    --memory-size 512 \
    --region $REGION

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Features:"
echo "  - Enhanced prompt engineering (CO-STAR framework)"
echo "  - Chain-of-Thought prompting"
echo "  - Improved instruction adherence"
echo "  - Response anchoring support"
echo "========================================="