#!/bin/bash

echo "🚀 Starting WebSocket Lambda deployment to Virginia (us-east-1)"

# 설정
FUNCTION_NAME="nx-tt-dev-ver3-websocket-message"
ROLE_NAME="nx-tt-dev-ver3-WebSocketLambdaRole"
REGION="us-east-1"
TABLE_NAME="nx-tt-dev-ver3-conversations"

# 1. 배포 디렉토리 생성
echo "1. Creating deployment package with proper folder structure..."
cd lambda/websocket

# Lambda가 lambda_function.py를 찾도록 복사
cp websocket_message_handler.py lambda_function.py

# shared 폴더 구조 유지하며 복사
mkdir -p shared
cp ../shared/bedrock_client.py shared/ 2>/dev/null
cp ../shared/bedrock_client_enhanced.py shared/ 2>/dev/null

# 모든 필요한 파일 포함 (shared 폴더 구조 유지)
zip -r websocket_deployment.zip lambda_function.py conversation_manager.py shared/ 2>/dev/null

# 임시 파일 삭제
rm lambda_function.py
rm -rf shared/

# 2. Lambda 함수 업데이트 또는 생성
echo "2. Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://websocket_deployment.zip \
    --region $REGION 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Function doesn't exist, creating new one..."
    
    # IAM 역할 생성
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }' \
        --region $REGION 2>/dev/null
    
    # 정책 연결
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region $REGION 2>/dev/null
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess \
        --region $REGION 2>/dev/null
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess \
        --region $REGION 2>/dev/null
    
    # Bedrock 정책 추가
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name BedrockInvokePolicy \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream"
                ],
                "Resource": "*"
            }]
        }' \
        --region $REGION 2>/dev/null
    
    # 10초 대기 (역할 생성 완료 대기)
    echo "Waiting for role to be ready..."
    sleep 10
    
    # Lambda 함수 생성
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role arn:aws:iam::887078546492:role/$ROLE_NAME \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://websocket_deployment.zip \
        --timeout 60 \
        --memory-size 512 \
        --description "WebSocket message handler for chat streaming" \
        --region $REGION
else
    echo "✅ Function code updated successfully"
fi

# 3. 환경 변수 설정
echo "3. Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={CONVERSATIONS_TABLE=$TABLE_NAME}" \
    --region $REGION > /dev/null 2>&1

# 4. API Gateway 권한 확인
echo "4. Checking API Gateway integration..."
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='nx-tt-dev-ver3-websocket-api'].ApiId" --output text)

if [ -n "$API_ID" ]; then
    # Lambda 권한 추가 (API Gateway가 Lambda를 호출할 수 있도록)
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id AllowAPIGatewayInvoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:887078546492:$API_ID/*/*/*" \
        --region $REGION 2>/dev/null
fi

echo ""
echo "========================================="
echo "✅ WebSocket Lambda Deployment Complete!"
echo "========================================="
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Table: $TABLE_NAME"
echo "API Gateway: wss://$API_ID.execute-api.$REGION.amazonaws.com/production"
echo "========================================="

# 배포 패키지 삭제
rm websocket_deployment.zip