#!/bin/bash

# API Gateway 설정 스크립트
REGION="us-east-1"
API_ID="qyfams2iva"
LAMBDA_FUNCTION="nx-tt-dev-ver3-prompt-crud"
STAGE_NAME="prod"

echo "🚀 Setting up API Gateway for Prompt CRUD operations..."

# 1. Root 리소스 ID 가져오기
echo "1. Getting root resource ID..."
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/'].id" \
    --output text)
echo "Root ID: $ROOT_ID"

# 2. /prompts 리소스 생성 또는 찾기
echo "2. Checking /prompts resource..."
PROMPTS_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/prompts'].id" \
    --output text)

if [ -z "$PROMPTS_ID" ]; then
    echo "Creating /prompts resource..."
    PROMPTS_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part prompts \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "Created /prompts resource: $PROMPTS_ID"
else
    echo "/prompts resource exists: $PROMPTS_ID"
fi

# 3. /prompts/{engineType} 리소스 생성 또는 찾기
echo "3. Checking /prompts/{engineType} resource..."
ENGINE_TYPE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/prompts/{engineType}'].id" \
    --output text)

if [ -z "$ENGINE_TYPE_ID" ]; then
    echo "Creating /prompts/{engineType} resource..."
    ENGINE_TYPE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $PROMPTS_ID \
        --path-part "{engineType}" \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "Created /prompts/{engineType} resource: $ENGINE_TYPE_ID"
else
    echo "/prompts/{engineType} resource exists: $ENGINE_TYPE_ID"
fi

# Lambda ARN 구성
LAMBDA_ARN="arn:aws:lambda:${REGION}:887078546492:function:${LAMBDA_FUNCTION}"
echo "Lambda ARN: $LAMBDA_ARN"

# 4. GET 메서드 설정
echo "4. Setting up GET method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method GET \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || echo "GET method already exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION 2>/dev/null || echo "GET integration already exists"

# 5. PUT 메서드 설정
echo "5. Setting up PUT method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method PUT \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || echo "PUT method already exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method PUT \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION 2>/dev/null || echo "PUT integration already exists"

# 6. DELETE 메서드 설정
echo "6. Setting up DELETE method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method DELETE \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || echo "DELETE method already exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method DELETE \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION 2>/dev/null || echo "DELETE integration already exists"

# 7. OPTIONS 메서드 설정 (CORS)
echo "7. Setting up OPTIONS method for CORS..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || echo "OPTIONS method already exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --integration-http-method OPTIONS \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION 2>/dev/null || echo "OPTIONS integration already exists"

# CORS 응답 헤더 설정
aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region $REGION 2>/dev/null || echo "OPTIONS integration response already exists"

aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $ENGINE_TYPE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $REGION 2>/dev/null || echo "OPTIONS method response already exists"

# 8. Lambda 권한 추가
echo "8. Adding Lambda permissions..."
for METHOD in GET PUT DELETE; do
    aws lambda add-permission \
        --function-name $LAMBDA_FUNCTION \
        --statement-id "apigateway-${METHOD}-$(date +%s)" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:887078546492:${API_ID}/*/${METHOD}/prompts/{engineType}" \
        --region $REGION 2>/dev/null || echo "Permission for ${METHOD} already exists"
done

# 9. API 배포
echo "9. Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE_NAME \
    --region $REGION

echo "==========================================="
echo "✅ API Gateway Setup Complete!"
echo "==========================================="
echo "API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"
echo "Resources:"
echo "  - GET    /prompts/{engineType}"
echo "  - PUT    /prompts/{engineType}"
echo "  - DELETE /prompts/{engineType}"
echo "  - OPTIONS /prompts/{engineType} (CORS)"
echo "==========================================="