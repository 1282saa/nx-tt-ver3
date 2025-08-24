#!/bin/bash

echo "🚀 Starting WebSocket Lambda deployment to Virginia (us-east-1)"

# 설정
FUNCTION_NAME="nx-tt-dev-ver3-websocket-message"
ROLE_NAME="nx-tt-dev-ver3-WebSocketLambdaRole"
REGION="us-east-1"
TABLE_NAME="nx-tt-dev-ver3-conversations"

# 1. 배포 디렉토리 생성
echo "1. Creating deployment package..."
cd lambda/websocket
zip -r websocket_deployment.zip websocket_message_handler.py

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
        --region $REGION
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess \
        --region $REGION
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess \
        --region $REGION
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess \
        --region $REGION
    
    # 역할 ARN 가져오기
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text --region $REGION)
    
    sleep 10  # IAM 역할 생성 대기
    
    # Lambda 함수 생성
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.9 \
        --role $ROLE_ARN \
        --handler websocket_message_handler.lambda_handler \
        --zip-file fileb://websocket_deployment.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment Variables="{CONVERSATIONS_TABLE=$TABLE_NAME}" \
        --region $REGION
else
    echo "✅ Function code updated successfully"
fi

# 3. 환경 변수 업데이트
echo "3. Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{CONVERSATIONS_TABLE=$TABLE_NAME}" \
    --timeout 300 \
    --memory-size 512 \
    --region $REGION > /dev/null

# 4. API Gateway 통합 확인
echo "4. Checking API Gateway integration..."
API_ID="hsdpbajz23"

# Lambda 권한 추가 (API Gateway가 Lambda 호출할 수 있도록)
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "apigateway-invoke-$API_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/*" \
    --region $REGION 2>/dev/null

# 5. 정리
rm websocket_deployment.zip

echo "
=========================================
✅ WebSocket Lambda Deployment Complete!
=========================================
Function: $FUNCTION_NAME
Region: $REGION (Virginia)
Table: $TABLE_NAME
API Gateway: wss://$API_ID.execute-api.$REGION.amazonaws.com/production
=========================================
"