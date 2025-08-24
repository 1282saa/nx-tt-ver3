#!/bin/bash

# AWS Cognito User Pool 생성 스크립트
# 버지니아 리전 (us-east-1) 사용

REGION="us-east-1"
USER_POOL_NAME="nx-tt-dev-ver3-user-pool"
CLIENT_NAME="nx-tt-dev-ver3-web-client"

echo "🔐 Creating AWS Cognito User Pool in $REGION..."

# 1. User Pool 생성
USER_POOL_OUTPUT=$(aws cognito-idp create-user-pool \
  --pool-name "$USER_POOL_NAME" \
  --region "$REGION" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --email-configuration '{
    "EmailSendingAccount": "COGNITO_DEFAULT"
  }' \
  --email-verification-subject "TITLE-HUB 회원가입 인증 코드" \
  --email-verification-message "안녕하세요! TITLE-HUB 회원가입 인증 코드는 {####} 입니다." \
  --schema '[
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    }
  ]' \
  --user-attribute-update-settings '{
    "AttributesRequireVerificationBeforeUpdate": ["email"]
  }')

# User Pool ID 추출
USER_POOL_ID=$(echo $USER_POOL_OUTPUT | jq -r '.UserPool.Id')
echo "✅ User Pool created: $USER_POOL_ID"

# 2. App Client 생성
CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "$CLIENT_NAME" \
  --region "$REGION" \
  --no-generate-secret \
  --explicit-auth-flows \
    ALLOW_USER_PASSWORD_AUTH \
    ALLOW_REFRESH_TOKEN_AUTH \
    ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --prevent-user-existence-errors ENABLED \
  --enable-token-revocation \
  --auth-session-validity 3 \
  --refresh-token-validity 30 \
  --access-token-validity 60 \
  --id-token-validity 60)

# Client ID 추출
CLIENT_ID=$(echo $CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientId')
echo "✅ App Client created: $CLIENT_ID"

# 3. 관리자 계정 생성 (ai@sedaily.com)
echo "👤 Creating admin user..."
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "ai@sedaily.com" \
  --user-attributes \
    Name=email,Value=ai@sedaily.com \
    Name=name,Value="Admin User" \
    Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region "$REGION"

# 4. 관리자 비밀번호 설정
echo "🔑 Setting admin password..."
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "ai@sedaily.com" \
  --password "Sedaily2024!" \
  --permanent \
  --region "$REGION"

echo "✅ Admin user created with email: ai@sedaily.com"

# 5. .env 파일 생성
ENV_FILE="../frontend/.env"
echo "📝 Creating .env file..."

cat > "$ENV_FILE" << EOF
# API 설정
VITE_API_BASE_URL=https://nx-tt-dev-ver3-api.sedaily.io
VITE_WS_URL=wss://nx-tt-dev-ver3-ws.sedaily.io

# AWS Cognito 설정 (버지니아 리전)
VITE_AWS_REGION=$REGION
VITE_AWS_COGNITO_USER_POOL_ID=$USER_POOL_ID
VITE_AWS_COGNITO_CLIENT_ID=$CLIENT_ID

# AWS API Gateway (버지니아 리전)
VITE_AWS_API_GATEWAY_URL=https://nx-tt-dev-ver3-api-gateway.execute-api.us-east-1.amazonaws.com/prod

# DynamoDB 테이블 이름
VITE_AWS_DYNAMODB_USAGE_TABLE=nx-tt-dev-ver3-user-usage-data
VITE_AWS_DYNAMODB_CONVERSATION_TABLE=nx-tt-dev-ver3-conversations

# S3 버킷
VITE_AWS_S3_BUCKET=nx-tt-dev-ver3-frontend

# CloudFront Distribution
VITE_AWS_CLOUDFRONT_URL=https://nx-tt-dev-ver3.cloudfront.net
EOF

echo "✅ .env file created at $ENV_FILE"

echo ""
echo "========================================="
echo "🎉 Cognito User Pool Setup Complete!"
echo "========================================="
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo "Region: $REGION"
echo ""
echo "Admin Account:"
echo "  Email: ai@sedaily.com"
echo "  Password: Sedaily2024!"
echo ""
echo "Environment variables saved to: $ENV_FILE"
echo "========================================="
echo ""
echo "📌 Next steps:"
echo "1. cd ../frontend"
echo "2. npm run dev"
echo "3. Test login with admin account"