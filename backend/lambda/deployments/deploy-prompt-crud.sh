#!/bin/bash

# Lambda 함수 생성
echo "Lambda 함수 생성 중..."
aws lambda create-function \
    --function-name nx-tt-dev-ver3-prompt-crud \
    --runtime python3.11 \
    --role arn:aws:iam::887078546492:role/LabRole \
    --handler prompt_crud_handler.lambda_handler \
    --zip-file fileb://prompt-crud-deployment.zip \
    --timeout 30 \
    --memory-size 256 \
    --region us-east-1 \
    --environment Variables={AWS_REGION=us-east-1} \
    2>/dev/null || \
aws lambda update-function-code \
    --function-name nx-tt-dev-ver3-prompt-crud \
    --zip-file fileb://prompt-crud-deployment.zip \
    --region us-east-1

echo "Lambda 함수 배포 완료"

# API Gateway 생성 또는 업데이트
API_ID=$(aws apigatewayv2 get-apis --region us-east-1 --query "Items[?Name=='nx-tt-dev-ver3-api'].ApiId" --output text)

if [ -z "$API_ID" ]; then
    echo "새 API Gateway 생성 중..."
    API_ID=$(aws apigatewayv2 create-api \
        --name nx-tt-dev-ver3-api \
        --protocol-type HTTP \
        --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
        --region us-east-1 \
        --query ApiId \
        --output text)
    echo "API Gateway 생성 완료: $API_ID"
else
    echo "기존 API Gateway 사용: $API_ID"
fi

# Lambda 통합 생성
echo "Lambda 통합 생성 중..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:us-east-1:887078546492:function:nx-tt-dev-ver3-prompt-crud \
    --payload-format-version 2.0 \
    --region us-east-1 \
    --query IntegrationId \
    --output text)

echo "통합 ID: $INTEGRATION_ID"

# 라우트 생성
echo "라우트 생성 중..."

# GET /prompts/{engineType}
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'GET /prompts/{engineType}' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# PUT /prompts/{engineType}
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'PUT /prompts/{engineType}' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# GET /prompts/{engineType}/files
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'GET /prompts/{engineType}/files' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# POST /prompts/{engineType}/files
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'POST /prompts/{engineType}/files' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# PUT /prompts/{engineType}/files/{fileId}
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'PUT /prompts/{engineType}/files/{fileId}' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# DELETE /prompts/{engineType}/files/{fileId}
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'DELETE /prompts/{engineType}/files/{fileId}' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# OPTIONS 라우트 (CORS)
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'OPTIONS /{proxy+}' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1 2>/dev/null || true

# Lambda 권한 추가
echo "Lambda 권한 설정 중..."
aws lambda add-permission \
    --function-name nx-tt-dev-ver3-prompt-crud \
    --statement-id apigateway-invoke-$API_ID \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:887078546492:$API_ID/*/*" \
    --region us-east-1 2>/dev/null || true

# Stage 배포
echo "API 배포 중..."
DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
    --api-id $API_ID \
    --region us-east-1 \
    --query DeploymentId \
    --output text)

# Stage 생성 또는 업데이트
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name prod \
    --deployment-id $DEPLOYMENT_ID \
    --region us-east-1 2>/dev/null || \
aws apigatewayv2 update-stage \
    --api-id $API_ID \
    --stage-name prod \
    --deployment-id $DEPLOYMENT_ID \
    --region us-east-1

# API 엔드포인트 출력
API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "======================================"
echo "배포 완료!"
echo "API 엔드포인트: $API_ENDPOINT"
echo ""
echo "사용 가능한 엔드포인트:"
echo "GET    $API_ENDPOINT/prompts/T5"
echo "PUT    $API_ENDPOINT/prompts/T5"
echo "GET    $API_ENDPOINT/prompts/T5/files"
echo "POST   $API_ENDPOINT/prompts/T5/files"
echo "PUT    $API_ENDPOINT/prompts/T5/files/{fileId}"
echo "DELETE $API_ENDPOINT/prompts/T5/files/{fileId}"
echo ""
echo "H8도 동일하게 T5를 H8로 변경하여 사용"
echo "======================================" 