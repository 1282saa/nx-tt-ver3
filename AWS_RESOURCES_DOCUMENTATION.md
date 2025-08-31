# 📦 AWS 리소스 전체 문서

## 현재 사용 중인 서비스: TITLE (nx-tt-dev-ver3)

---

## 🏗️ 현재 리소스 구조

### 네이밍 컨벤션

```
nx-tt-dev-ver3-[리소스명]
│  │   │   │
│  │   │   └── 버전
│  │   └────── 환경 (dev/prod)
│  └────────── 서비스명 (tt=title)
└───────────── 프로젝트 prefix
```

---

## 1️⃣ Lambda Functions (8개)

| 함수명                                | 용도                  | 런타임      |
| ------------------------------------- | --------------------- | ----------- |
| `nx-tt-dev-ver3-ConversationHandler`  | 대화 관리 API         | Python 3.11 |
| `nx-tt-dev-ver3-conversation-api`     | 대화 CRUD API         | Python 3.11 |
| `nx-tt-dev-ver3-prompt-crud`          | 프롬프트 관리 API     | Python 3.11 |
| `nx-tt-dev-ver3-title-generation`     | 제목 자동 생성        | Python 3.11 |
| `nx-tt-dev-ver3-usage-handler`        | 사용량 추적           | Python 3.11 |
| `nx-tt-dev-ver3-websocket-connect`    | WebSocket 연결        | Python 3.11 |
| `nx-tt-dev-ver3-websocket-disconnect` | WebSocket 해제        | Python 3.11 |
| `nx-tt-dev-ver3-websocket-message`    | WebSocket 메시지 처리 | Python 3.11 |

### Lambda Function URLs

- **Conversation API**: `https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws`
- **Prompt CRUD API**: `https://hk2z7e5pbvrgpslf2vzuhkbzfq0ywwtb.lambda-url.us-east-1.on.aws`
- **Usage Handler**: `https://q2kzxmaxz34a5ufpxtgudmlsay0ijuzu.lambda-url.us-east-1.on.aws`

---

## 2️⃣ DynamoDB Tables (5개)

| 테이블명                               | 용도                | 파티션 키      |
| -------------------------------------- | ------------------- | -------------- |
| `nx-tt-dev-ver3-conversations`         | 대화 내역 저장      | conversationId |
| `nx-tt-dev-ver3-files`                 | 첨부 파일 저장      | fileId         |
| `nx-tt-dev-ver3-prompts`               | 프롬프트 저장       | promptId       |
| `nx-tt-dev-ver3-usage-tracking`        | 사용량 추적         | userId         |
| `nx-tt-dev-ver3-websocket-connections` | WebSocket 연결 관리 | connectionId   |

---

## 3️⃣ API Gateway

### REST API

- **Name**: `nx-tt-dev-ver3-api`
- **API ID**: `o96dgrd6ji`
- **Endpoint**: `https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com`
- **용도**: 프롬프트 CRUD 작업

### WebSocket API

- **Name**: `nx-tt-dev-ver3-websocket-api`
- **API ID**: `hsdpbajz23`
- **Endpoint**: `wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com`
- **용도**: 실시간 채팅 스트리밍

---

## 4️⃣ Cognito

### User Pool

- **Name**: `nx-tt-dev-ver3-user-pool`
- **Pool ID**: `us-east-1_ohLOswurY`
- **Client ID**: `1ov5fq5vd5foitecn2q83d7oko`
- **용도**: 사용자 인증 관리

---

## 5️⃣ Frontend Configuration

### 환경 변수 (.env.development)

```env
VITE_API_URL=https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod
VITE_PROMPT_API_URL=https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com
VITE_WEBSOCKET_URL=wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod
VITE_USE_MOCK=false
```

### 로컬 개발 포트

- **Frontend**: `http://localhost:3000`
- **Backend**: N/A (서버리스)

---

## 6️⃣ IAM Roles

- **Lambda 실행 역할**: `nx-tt-dev-ver3-lambda-role`
  - DynamoDB 읽기/쓰기
  - Bedrock 호출
  - CloudWatch Logs
  - API Gateway 관리

---

## 7️⃣ CloudWatch Log Groups

각 Lambda 함수별로 자동 생성:

- `/aws/lambda/nx-tt-dev-ver3-ConversationHandler`
- `/aws/lambda/nx-tt-dev-ver3-conversation-api`
- `/aws/lambda/nx-tt-dev-ver3-prompt-crud`
- `/aws/lambda/nx-tt-dev-ver3-title-generation`
- `/aws/lambda/nx-tt-dev-ver3-usage-handler`
- `/aws/lambda/nx-tt-dev-ver3-websocket-connect`
- `/aws/lambda/nx-tt-dev-ver3-websocket-disconnect`
- `/aws/lambda/nx-tt-dev-ver3-websocket-message`

---

## 🔄 클론을 위한 리소스 변경 가이드

### 교열 서비스 (Proofreading) 예시

기존: `nx-tt-dev-ver3-*` → 신규: `nx-prf-dev-ver3-*`

#### 1. Lambda Functions

```bash
nx-tt-dev-ver3-ConversationHandler → nx-prf-dev-ver3-ConversationHandler
nx-tt-dev-ver3-conversation-api → nx-prf-dev-ver3-conversation-api
nx-tt-dev-ver3-prompt-crud → nx-prf-dev-ver3-prompt-crud
# ... 이하 동일 패턴
```

#### 2. DynamoDB Tables

```bash
nx-tt-dev-ver3-conversations → nx-prf-dev-ver3-conversations
nx-tt-dev-ver3-files → nx-prf-dev-ver3-files
nx-tt-dev-ver3-prompts → nx-prf-dev-ver3-prompts
# ... 이하 동일 패턴
```

#### 3. API Gateway

```bash
nx-tt-dev-ver3-api → nx-prf-dev-ver3-api
nx-tt-dev-ver3-websocket-api → nx-prf-dev-ver3-websocket-api
```

#### 4. Cognito

```bash
nx-tt-dev-ver3-user-pool → nx-prf-dev-ver3-user-pool
```

#### 5. IAM Role

```bash
nx-tt-dev-ver3-lambda-role → nx-prf-dev-ver3-lambda-role
```

---

## 📝 변경 필요 파일 목록

### Backend 파일

1. **배포 스크립트** (`/backend/deploy-*.sh`)

   - Lambda 함수명 변경
   - DynamoDB 테이블명 변경
   - API Gateway ID 변경

2. **Lambda 코드** (`/backend/lambda/**/*.py`)
   - DynamoDB 테이블명 참조 변경
   - 환경 변수 업데이트

### Frontend 파일

1. **환경 설정** (`/frontend/.env.development`)

   - API URL 변경
   - WebSocket URL 변경

2. **AWS 설정** (`/frontend/src/services/authService.js`)

   - Cognito User Pool ID 변경
   - Client ID 변경

3. **서비스 파일** (`/frontend/src/services/*.js`)
   - API 엔드포인트 참조 업데이트

---

## 🚀 클론 배포 순서

1. **AWS 리소스 생성**

   ```bash
   # 1. Cognito User Pool 생성
   # 2. DynamoDB 테이블 생성
   # 3. Lambda 함수 생성 및 배포
   # 4. API Gateway 생성 및 설정
   # 5. Lambda Function URL 생성
   ```

2. **Backend 배포**

   ```bash
   # 배포 스크립트 수정 후
   ./deploy-conversation-lambda.sh
   ./deploy-websocket-lambda-with-enhanced.sh
   ./deploy-usage-lambda.sh
   ```

3. **Frontend 설정 및 배포**
   ```bash
   # .env 파일 수정 후
   npm install
   npm run build
   npm run dev  # 로컬 테스트
   ```

---

## 📌 중요 참고사항

1. **리전**: 모든 리소스는 `us-east-1` (버지니아)에 위치
2. **런타임**: Python 3.11 사용 중
3. **프레임워크**: Frontend - React + Vite
4. **AI 모델**: AWS Bedrock Claude Sonnet 4.0
5. **포트 충돌 방지**:
   - 현재: 3000번 (Title 서비스)
   - 교열: 3001번 권장
   - 기타: 3002, 3003... 순차 사용

---

## 🎯 서비스별 Prefix 제안

| 서비스       | Prefix    | 용도      |
| ------------ | --------- | --------- |
| Title (현재) | `nx-tt-`  | 제목 생성 |
| Proofreading | `nx-prf-` | 교열      |
| Writing      | `nx-wrt-` | 작성      |
| Translation  | `nx-trn-` | 번역      |
| Summary      | `nx-sum-` | 요약      |

---

_작성일: 2025년 8월 26일_
_작성자: Claude Code Assistant_
