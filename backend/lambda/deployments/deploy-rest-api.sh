#!/bin/bash

# REST API Lambda 배포 스크립트
# nx-tt-dev-ver3-prompt-crud 함수 배포

echo "🚀 Deploying REST API Lambda function..."

# 현재 스크립트 위치에서 상위 lambda 디렉터리로 이동
cd "$(dirname "$0")/.."

# 임시 빌드 디렉터리 생성
BUILD_DIR="build/rest-api"
mkdir -p "$BUILD_DIR"

# 공유 라이브러리 복사
cp -r shared "$BUILD_DIR/"

# REST API 핸들러 복사
cp rest-api/prompt_crud_handler.py "$BUILD_DIR/"

# 배포 패키지 생성
cd "$BUILD_DIR"
zip -r ../../deployments/rest-api-deployment.zip . -x "*.pyc" "__pycache__/*"

cd ../../deployments

# Lambda 함수 업데이트
aws lambda update-function-code \
  --function-name nx-tt-dev-ver3-prompt-crud \
  --zip-file fileb://rest-api-deployment.zip \
  --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ REST API Lambda function deployed successfully!"
    echo "Function: nx-tt-dev-ver3-prompt-crud"
    echo "API Endpoint: https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com"
else
    echo "❌ REST API deployment failed!"
    exit 1
fi

# 정리
rm -rf ../build
echo "🧹 Cleanup completed"