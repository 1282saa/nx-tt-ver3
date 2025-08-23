#!/bin/bash

# WebSocket API Lambda 배포 스크립트
# 모든 WebSocket Lambda 함수들을 배포

echo "🚀 Deploying WebSocket API Lambda functions..."

# 현재 스크립트 위치에서 상위 lambda 디렉터리로 이동
cd "$(dirname "$0")/.."

# 함수 목록
FUNCTIONS=("connect" "disconnect" "message")
LAMBDA_NAMES=("nx-tt-dev-ver3-websocket-connect" "nx-tt-dev-ver3-websocket-disconnect" "nx-tt-dev-ver3-websocket-message")

# 각 함수별 배포
for i in "${!FUNCTIONS[@]}"; do
    FUNC_NAME="${FUNCTIONS[$i]}"
    LAMBDA_NAME="${LAMBDA_NAMES[$i]}"
    
    echo "📦 Building $FUNC_NAME handler..."
    
    # 임시 빌드 디렉터리 생성
    BUILD_DIR="build/websocket-$FUNC_NAME"
    mkdir -p "$BUILD_DIR"
    
    # 공유 라이브러리 복사
    cp -r shared "$BUILD_DIR/"
    
    # WebSocket 핸들러 복사
    cp websocket/websocket_${FUNC_NAME}_handler.py "$BUILD_DIR/"
    
    # 배포 패키지 생성
    cd "$BUILD_DIR"
    zip -r ../../deployments/websocket-${FUNC_NAME}-deployment.zip . -x "*.pyc" "__pycache__/*"
    
    cd ../../deployments
    
    # Lambda 함수 업데이트
    echo "🚀 Deploying $LAMBDA_NAME..."
    aws lambda update-function-code \
      --function-name "$LAMBDA_NAME" \
      --zip-file fileb://websocket-${FUNC_NAME}-deployment.zip \
      --region us-east-1
    
    if [ $? -eq 0 ]; then
        echo "✅ $LAMBDA_NAME deployed successfully!"
    else
        echo "❌ $LAMBDA_NAME deployment failed!"
        exit 1
    fi
    
    cd ..
done

echo ""
echo "🎉 All WebSocket Lambda functions deployed successfully!"
echo "WebSocket API Endpoint: wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "Functions deployed:"
for LAMBDA_NAME in "${LAMBDA_NAMES[@]}"; do
    echo "  - $LAMBDA_NAME"
done

# 정리
rm -rf build
echo "🧹 Cleanup completed"