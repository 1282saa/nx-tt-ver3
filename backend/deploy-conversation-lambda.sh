#!/bin/bash

echo "🚀 Deploying Conversation REST API Lambda..."

# 설정
FUNCTION_NAME="nx-tt-dev-ver3-conversation-api"
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::887078546492:role/nx-tt-dev-ver3-lambda-role"

# 1. 배포 패키지 생성
cd lambda/rest-api
zip conversation_deployment.zip conversation_handler.py

# 2. Lambda 함수 생성 또는 업데이트
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://conversation_deployment.zip \
        --region $REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler conversation_handler.lambda_handler \
        --zip-file fileb://conversation_deployment.zip \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION \
        --description "Conversation REST API for DynamoDB"
fi

# 3. Lambda 권한 추가
echo "Adding Lambda permissions..."
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id api-gateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:887078546492:qyfams2iva/*/*" \
    --region $REGION 2>/dev/null || true

# 정리
rm -f conversation_deployment.zip

echo "✅ Lambda Deployment complete!"
echo ""
echo "==========================================="
echo "Lambda Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "==========================================="