#!/bin/bash

echo "🚀 Usage Tracking Lambda 함수 배포 스크립트"
echo "============================================"

LAMBDA_NAME="nx-tt-dev-ver3-usage-handler"
LAMBDA_ROLE="arn:aws:iam::887078546492:role/nx-tt-dev-ver3-lambda-role"
REGION="us-east-1"

# 1. 기존 파일 정리 및 패키징
echo "📦 Lambda 패키지 준비 중..."

# 임시 디렉토리 생성
mkdir -p lambda-package
cd lambda-package

# Lambda 함수 코드 복사
cp ../lambda/rest-api/usage_handler.py lambda_function.py
cp ../lambda/shared/usage_db_schema.py usage_db_schema.py

# requirements.txt 생성 (필요한 패키지만)
cat > requirements.txt << EOF
boto3>=1.26.0
botocore>=1.29.0
EOF

# 패키지 설치 (AWS Lambda Python 런타임에 boto3는 기본 포함)
echo "📦 의존성 패키지 설치..."
# pip3 install -r requirements.txt -t .

# ZIP 파일 생성
echo "🗜️  ZIP 파일 생성 중..."
zip -r ../usage_handler.zip . -x "*.pyc" "*__pycache__*"

cd ..
rm -rf lambda-package

echo "✅ 패키징 완료: usage_handler.zip"

# 2. Lambda 함수 생성 또는 업데이트
echo "🔧 Lambda 함수 배포 중..."

# 기존 함수 존재 확인
if aws lambda get-function --function-name $LAMBDA_NAME --region $REGION &> /dev/null; then
    echo "🔄 기존 Lambda 함수 업데이트..."
    aws lambda update-function-code \
        --function-name $LAMBDA_NAME \
        --zip-file fileb://usage_handler.zip \
        --region $REGION
    
    echo "⚙️  함수 설정 업데이트..."
    aws lambda update-function-configuration \
        --function-name $LAMBDA_NAME \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables='{DYNAMODB_TABLE=nx-tt-dev-ver3-usage-tracking}' \
        --region $REGION
else
    echo "🆕 새로운 Lambda 함수 생성..."
    aws lambda create-function \
        --function-name $LAMBDA_NAME \
        --runtime python3.9 \
        --role $LAMBDA_ROLE \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://usage_handler.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables='{DYNAMODB_TABLE=nx-tt-dev-ver3-usage-tracking}' \
        --region $REGION
fi

echo "✅ Lambda 함수 배포 완료!"

# 3. API Gateway 통합 권한 설정
echo "🔗 API Gateway 연동 권한 설정..."

# API Gateway에서 Lambda 호출 권한 부여
aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id apigateway-access \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:887078546492:*/*" \
    --region $REGION 2>/dev/null || echo "권한이 이미 존재합니다."

# 4. 함수 정보 출력
echo "📋 배포된 Lambda 함수 정보:"
aws lambda get-function --function-name $LAMBDA_NAME --region $REGION --query 'Configuration.[FunctionName,Runtime,Handler,State,LastModified]' --output table

echo ""
echo "🎉 Usage Tracking Lambda 배포 완료!"
echo "📋 함수명: $LAMBDA_NAME"
echo "🌍 리전: $REGION"
echo "📊 DynamoDB 테이블: nx-tt-dev-ver3-usage-tracking"
echo ""
echo "다음 단계:"
echo "1. API Gateway에서 Lambda 함수 연결"
echo "2. 프론트엔드에서 API 엔드포인트 테스트"

# 정리
rm -f usage_handler.zip

echo "🧹 정리 완료!"