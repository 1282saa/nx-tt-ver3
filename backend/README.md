# Title Generation Backend

AWS Bedrock Claude Sonnet 4를 사용한 뉴스 제목 생성 서비스 백엔드

## 구조

- **Lambda Function**: 제목 생성 로직
- **API Gateway**: REST API 엔드포인트
- **Bedrock**: Claude Sonnet 4 모델 호출

## 로컬 테스트

```bash
# 의존성 설치
pip install -r requirements.txt

# AWS 자격 증명 설정
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# 테스트 실행
python test_local.py
```

## 배포

### 사전 요구사항
- AWS CLI 설정 완료
- SAM CLI 설치
- Bedrock 모델 액세스 권한

### 배포 명령어

```bash
# 배포 스크립트 실행
./deploy.sh
```

또는 수동 배포:

```bash
# SAM 빌드
sam build

# SAM 배포
sam deploy --guided
```

## API 사용법

### 엔드포인트
`POST /generate-titles`

### 요청 본문
```json
{
    "article_content": "기사 내용..."
}
```

### 응답
```json
{
    "success": true,
    "data": {
        "titles": [
            "제목 1",
            "제목 2",
            "...",
            "제목 10"
        ],
        "count": 10,
        "model": "anthropic.claude-sonnet-4-20250514-v1:0"
    }
}
```

## 환경 변수

- `AWS_REGION`: AWS 리전 (기본값: us-east-1)

## 모델 정보

- **모델**: Claude Sonnet 4
- **Model ID**: `anthropic.claude-sonnet-4-20250514-v1:0`
- **Max Tokens**: 4096
- **Temperature**: 0.2