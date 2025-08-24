#!/bin/bash

# 버지니아 리전에 WebSocket API 생성 및 Lambda 연결

REGION="us-east-1"
API_NAME="nx-tt-dev-ver3-websocket-api"
STAGE_NAME="production"

echo "🚀 Creating WebSocket API in Virginia (us-east-1)"

# 1. WebSocket API 생성
echo "1. Creating WebSocket API..."
API_ID=$(aws apigatewayv2 create-api \
    --name $API_NAME \
    --protocol-type WEBSOCKET \
    --route-selection-expression '$request.body.action' \
    --region $REGION \
    --output text \
    --query 'ApiId')

echo "✅ API Created: $API_ID"

# 2. Lambda 함수 ARN 가져오기
echo "2. Getting Lambda function ARNs..."
CONNECT_ARN=$(aws lambda get-function --function-name nx-tt-dev-ver3-websocket-connect --region $REGION --query 'Configuration.FunctionArn' --output text)
DISCONNECT_ARN=$(aws lambda get-function --function-name nx-tt-dev-ver3-websocket-disconnect --region $REGION --query 'Configuration.FunctionArn' --output text)
MESSAGE_ARN=$(aws lambda get-function --function-name nx-tt-dev-ver3-websocket-message --region $REGION --query 'Configuration.FunctionArn' --output text)

echo "Connect Lambda: $CONNECT_ARN"
echo "Disconnect Lambda: $DISCONNECT_ARN"
echo "Message Lambda: $MESSAGE_ARN"

# 3. Integration 생성
echo "3. Creating integrations..."

# Connect integration
CONNECT_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$CONNECT_ARN/invocations" \
    --region $REGION \
    --output text \
    --query 'IntegrationId')

# Disconnect integration
DISCONNECT_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$DISCONNECT_ARN/invocations" \
    --region $REGION \
    --output text \
    --query 'IntegrationId')

# Message integration
MESSAGE_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$MESSAGE_ARN/invocations" \
    --region $REGION \
    --output text \
    --query 'IntegrationId')

echo "✅ Integrations created"

# 4. Routes 생성
echo "4. Creating routes..."

# $connect route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$connect' \
    --target "integrations/$CONNECT_INTEGRATION" \
    --region $REGION

# $disconnect route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$disconnect' \
    --target "integrations/$DISCONNECT_INTEGRATION" \
    --region $REGION

# sendMessage route (default)
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'sendMessage' \
    --target "integrations/$MESSAGE_INTEGRATION" \
    --region $REGION

# $default route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$default' \
    --target "integrations/$MESSAGE_INTEGRATION" \
    --region $REGION

echo "✅ Routes created"

# 5. Stage 생성
echo "5. Creating deployment stage..."
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name $STAGE_NAME \
    --auto-deploy \
    --region $REGION

# 6. Lambda 권한 추가
echo "6. Adding Lambda permissions..."

# Connect
aws lambda add-permission \
    --function-name nx-tt-dev-ver3-websocket-connect \
    --statement-id "APIGatewayWebSocket-$API_ID-connect" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*" \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# Disconnect
aws lambda add-permission \
    --function-name nx-tt-dev-ver3-websocket-disconnect \
    --statement-id "APIGatewayWebSocket-$API_ID-disconnect" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*" \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# Message
aws lambda add-permission \
    --function-name nx-tt-dev-ver3-websocket-message \
    --statement-id "APIGatewayWebSocket-$API_ID-message" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*" \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# 7. Endpoint URL 가져오기
ENDPOINT=$(aws apigatewayv2 get-api \
    --api-id $API_ID \
    --region $REGION \
    --query 'ApiEndpoint' \
    --output text)

echo ""
echo "========================================="
echo "✅ WebSocket API Created Successfully!"
echo "========================================="
echo "API ID: $API_ID"
echo "Region: $REGION (Virginia)"
echo "Endpoint: $ENDPOINT/$STAGE_NAME"
echo ""
echo "Add this to your .env files:"
echo "VITE_WEBSOCKET_URL=$ENDPOINT/$STAGE_NAME"
echo "========================================="