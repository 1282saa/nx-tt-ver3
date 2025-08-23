#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Title Generation Service 배포 시작${NC}"

# S3 버킷 이름 (SAM 배포용)
BUCKET_NAME="title-generation-sam-deploy-${RANDOM}"
STACK_NAME="title-generation-stack"
REGION="us-east-1"

# 1. S3 버킷 생성 (없으면)
echo -e "${YELLOW}S3 배포 버킷 확인/생성 중...${NC}"
if ! aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "버킷이 이미 존재합니다: ${BUCKET_NAME}"
else
    aws s3 mb "s3://${BUCKET_NAME}" --region ${REGION}
    echo -e "${GREEN}S3 버킷 생성 완료: ${BUCKET_NAME}${NC}"
fi

# 2. SAM 빌드
echo -e "${YELLOW}SAM 애플리케이션 빌드 중...${NC}"
sam build

# 3. SAM 패키징
echo -e "${YELLOW}SAM 패키징 중...${NC}"
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket ${BUCKET_NAME} \
    --region ${REGION}

# 4. SAM 배포
echo -e "${YELLOW}CloudFormation 스택 배포 중...${NC}"
sam deploy \
    --template-file packaged.yaml \
    --stack-name ${STACK_NAME} \
    --capabilities CAPABILITY_IAM \
    --region ${REGION} \
    --no-fail-on-empty-changeset

# 5. 스택 출력 가져오기
echo -e "${YELLOW}API 엔드포인트 정보 가져오는 중...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text \
    --region ${REGION})

echo -e "${GREEN}배포 완료!${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"

# 6. 환경 변수 파일 생성
echo -e "${YELLOW}프론트엔드용 환경 변수 파일 생성 중...${NC}"
cat > ../src/.env.production << EOF
VITE_API_URL=${API_URL}
EOF

echo -e "${GREEN}.env.production 파일 생성 완료${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}배포 완료!${NC}"
echo -e "${GREEN}API Endpoint: ${API_URL}${NC}"
echo -e "${GREEN}========================================${NC}"