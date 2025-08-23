#!/bin/bash

# WebSocket Lambda 핸들러 배포 스크립트

echo "🚀 WebSocket Lambda 핸들러 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Lambda 함수 목록
FUNCTIONS=(
    "nx-tt-dev-ver3-websocket-connect:../websocket/websocket_connect_handler.py"
    "nx-tt-dev-ver3-websocket-disconnect:../websocket/websocket_disconnect_handler.py"
    "nx-tt-dev-ver3-websocket-message:../websocket/websocket_message_handler.py"
)

# 각 Lambda 함수 배포
for FUNC_INFO in "${FUNCTIONS[@]}"; do
    IFS=':' read -r FUNCTION_NAME HANDLER_FILE <<< "$FUNC_INFO"
    
    echo -e "\n${YELLOW}📦 ${FUNCTION_NAME} 배포 중...${NC}"
    
    # 임시 디렉토리 생성
    TEMP_DIR=$(mktemp -d)
    
    # 핸들러 파일 복사 (파일명을 lambda_function.py로 변경)
    cp "$HANDLER_FILE" "$TEMP_DIR/lambda_function.py"
    
    # ZIP 파일 생성
    cd "$TEMP_DIR"
    zip -q deployment.zip lambda_function.py
    
    # Lambda 함수 업데이트
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://deployment.zip \
        --region us-east-1 \
        --output json > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${FUNCTION_NAME} 배포 성공${NC}"
        
        # Handler 설정 업데이트
        aws lambda update-function-configuration \
            --function-name "$FUNCTION_NAME" \
            --handler "lambda_function.lambda_handler" \
            --region us-east-1 \
            --output json > /dev/null 2>&1
            
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}   Handler 설정 업데이트 완료${NC}"
        fi
    else
        echo -e "${RED}❌ ${FUNCTION_NAME} 배포 실패${NC}"
    fi
    
    # 임시 디렉토리 정리
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
done

echo -e "\n${GREEN}🎉 WebSocket Lambda 핸들러 배포 완료!${NC}"

# 배포 상태 확인
echo -e "\n${YELLOW}📊 배포 상태 확인:${NC}"
for FUNC_INFO in "${FUNCTIONS[@]}"; do
    IFS=':' read -r FUNCTION_NAME HANDLER_FILE <<< "$FUNC_INFO"
    
    LAST_MODIFIED=$(aws lambda get-function --function-name "$FUNCTION_NAME" \
        --region us-east-1 \
        --query 'Configuration.LastModified' \
        --output text 2>/dev/null)
    
    if [ ! -z "$LAST_MODIFIED" ]; then
        echo -e "  ${GREEN}✓${NC} ${FUNCTION_NAME}: ${LAST_MODIFIED}"
    else
        echo -e "  ${RED}✗${NC} ${FUNCTION_NAME}: 확인 실패"
    fi
done