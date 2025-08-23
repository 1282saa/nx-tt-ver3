#!/bin/bash

# Lambda 함수 배포 스크립트 (버지니아 리전)

FUNCTION_NAME="nx-tt-dev-ver3-ConversationHandler"
REGION="us-east-1"  # 버지니아
ROLE_NAME="nx-tt-dev-ver3-LambdaConversationRole"
RUNTIME="python3.9"
DEPLOYMENT_DIR="lambda/deployments/conversation"

echo "🚀 Starting Lambda function deployment for nx-tt-dev-ver3-ConversationHandler (Virginia)"

# 1. 배포 디렉토리 생성
echo "1. Creating deployment directory..."
mkdir -p $DEPLOYMENT_DIR
cp lambda/rest-api/conversation_handler.py $DEPLOYMENT_DIR/lambda_function.py

# 2. ZIP 파일 생성
echo "2. Creating deployment package..."
cd $DEPLOYMENT_DIR
zip -r ../conversation_handler.zip lambda_function.py
cd ../../..

# 3. IAM 역할 생성 (이미 존재하면 건너뜀)
echo "3. Creating IAM role..."
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }
        ]
    }' \
    --region $REGION 2>/dev/null || echo "Role already exists"

# 4. 정책 연결
echo "4. Attaching policies..."
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region $REGION 2>/dev/null

# DynamoDB 정책 생성 및 연결
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name DynamoDBAccess \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:Query",
                    "dynamodb:DeleteItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:Scan",
                    "dynamodb:DescribeTable"
                ],
                "Resource": [
                    "arn:aws:dynamodb:ap-northeast-2:*:table/Conversations",
                    "arn:aws:dynamodb:ap-northeast-2:*:table/Conversations/index/*"
                ]
            }
        ]
    }' \
    --region $REGION

# 5. 역할 ARN 가져오기
echo "5. Getting role ARN..."
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text --region $REGION)
echo "Role ARN: $ROLE_ARN"

# 잠시 대기 (역할 생성 시간)
sleep 10

# 6. Lambda 함수 생성 또는 업데이트
echo "6. Deploying Lambda function..."
aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://lambda/deployments/conversation_handler.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables={CONVERSATIONS_TABLE=Conversations,AWS_REGION_DYNAMODB=ap-northeast-2} \
    --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Lambda function created successfully"
else
    echo "Function already exists, updating..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda/deployments/conversation_handler.zip \
        --region $REGION
    
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables={CONVERSATIONS_TABLE=Conversations,AWS_REGION_DYNAMODB=ap-northeast-2} \
        --region $REGION
    
    echo "✅ Lambda function updated successfully"
fi

# 7. Function URL 생성 (간단한 HTTP 엔드포인트)
echo "7. Creating Function URL..."
aws lambda create-function-url-config \
    --function-name $FUNCTION_NAME \
    --auth-type NONE \
    --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"],"MaxAge":86400}' \
    --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Function URL created"
else
    echo "Function URL already exists, updating CORS..."
    aws lambda update-function-url-config \
        --function-name $FUNCTION_NAME \
        --auth-type NONE \
        --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"],"MaxAge":86400}' \
        --region $REGION
fi

# 8. 권한 추가 (Function URL 접근 허용)
echo "8. Adding permissions..."
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# 9. Function URL 가져오기
echo "9. Getting Function URL..."
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name $FUNCTION_NAME \
    --query 'FunctionUrl' \
    --output text \
    --region $REGION)

echo ""
echo "========================================="
echo "✅ Deployment Complete! (Virginia Region)"
echo "========================================="
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION (US East - Virginia)"
echo "Function URL: $FUNCTION_URL"
echo ""
echo "Add this to your .env file:"
echo "REACT_APP_API_URL=$FUNCTION_URL"
echo "========================================="