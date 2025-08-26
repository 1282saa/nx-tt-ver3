# Nexus 프로젝트 기술 문서

## 📋 프로젝트 개요
- **프로젝트명**: Nexus (서울경제신문 AI 대화 서비스)
- **설명**: 기업 CEO를 위한 맞춤형 기사 선별 AI 서비스
- **엔진 타입**: T5 (Title), H8 (Hub)

## 🏗️ 시스템 아키텍처

### Frontend
- **프레임워크**: React 18
- **라우팅**: React Router v6
- **상태 관리**: React Hooks (useState, useEffect, useRef)
- **스타일링**: Tailwind CSS
- **애니메이션**: Framer Motion
- **개발 서버**: Vite

### Backend
- **WebSocket API**: AWS API Gateway (WebSocket)
- **REST API**: AWS Lambda Function URL
- **AI 모델**: AWS Bedrock (Claude 3 Sonnet)
- **인증**: AWS Cognito
- **데이터베이스**: AWS DynamoDB
- **리전**: us-east-1 (버지니아)

## 🔗 API 엔드포인트

### 1. WebSocket API
```
URL: wss://0zv5b3ekq5.execute-api.us-east-1.amazonaws.com/production
```
- **용도**: 실시간 AI 스트리밍 응답
- **메시지 타입**:
  - `chat_start`: 대화 시작
  - `ai_start`: AI 응답 시작
  - `ai_chunk`: 스트리밍 청크
  - `chat_end`: 대화 종료

### 2. Conversation REST API
```
URL: https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws
```
- **Lambda 함수명**: `nx-tt-dev-ver3-conversation-api`
- **엔드포인트**:
  - `GET /conversations`: 대화 목록 조회
  - `POST /conversations`: 새 대화 생성/업데이트
  - `GET /conversations/{id}`: 특정 대화 조회
  - `DELETE /conversations/{id}`: 대화 삭제

### 3. Usage API
```
URL: https://72c6zgalfvms445o6krqoplr5y0yeews.lambda-url.us-east-1.on.aws
```
- **Lambda 함수명**: `nx-tt-dev-ver3-usage-api`
- **용도**: 사용량 추적 및 관리

## 💾 데이터베이스

### DynamoDB 테이블
```
테이블명: nx-tt-dev-ver3-conversations
파티션 키: conversationId (String)
```

**스키마**:
```json
{
  "conversationId": "H8_1756123231081",
  "userId": "b498b418-b0e1-70bc-3ab3-fd70cd0f7921",
  "engineType": "H8",
  "title": "대화 제목",
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant",
      "type": "user|assistant",
      "content": "메시지 내용",
      "timestamp": "2025-08-25T12:00:00.000Z"
    }
  ],
  "createdAt": "2025-08-25T12:00:00.000000",
  "updatedAt": "2025-08-25T12:00:00.000000",
  "metadata": {}
}
```

## 🔐 인증 시스템

### AWS Cognito
- **User Pool**: 사용자 인증 관리
- **저장 정보**:
  - `userInfo.userId`: 고유 사용자 ID (우선)
  - `userInfo.email`: 이메일
  - `userInfo.username`: 사용자명
- **토큰 저장**: localStorage
  - `authToken`: 인증 토큰
  - `idToken`: ID 토큰
  - `refreshToken`: 리프레시 토큰

## 📁 주요 파일 구조

### Frontend
```
frontend/
├── src/
│   ├── components/
│   │   ├── App.jsx              # 메인 앱 컴포넌트
│   │   ├── ChatPage.jsx         # 대화 페이지
│   │   ├── ChatInput.jsx        # 채팅 입력 컴포넌트
│   │   ├── MainContent.jsx      # 메인 콘텐츠
│   │   ├── Sidebar.jsx          # 사이드바 (쓰레드 목록)
│   │   ├── Header.jsx           # 헤더
│   │   └── Dashboard.jsx        # 대시보드
│   ├── services/
│   │   ├── conversationService.js  # 대화 관리 서비스
│   │   ├── websocketService.js     # WebSocket 통신
│   │   ├── authService.js          # 인증 서비스
│   │   └── usageService.js         # 사용량 관리
│   └── hooks/
│       ├── useWebSocketChat.js     # WebSocket 훅
│       └── useMessageManager.js    # 메시지 관리 훅
```

### Backend
```
backend/
├── lambda/
│   ├── deployments/
│   │   ├── conversation/
│   │   │   └── lambda_function.py  # 대화 REST API
│   │   ├── websocket/
│   │   │   └── lambda_function.py  # WebSocket 핸들러
│   │   └── usage/
│   │       └── lambda_function.py  # 사용량 API
│   └── shared/
│       └── bedrock_client.py       # Bedrock 클라이언트
├── deploy-conversation-lambda.sh   # 대화 Lambda 배포
├── deploy-websocket-lambda-virginia.sh  # WebSocket Lambda 배포
└── create-usage-table.py           # DynamoDB 테이블 생성
```

## 🔄 주요 기능 구현

### 1. 대화 저장 플로우
1. 사용자가 메인 페이지에서 메시지 입력
2. 대화 페이지로 이동 (conversationId 생성)
3. WebSocket을 통해 AI 응답 스트리밍
4. **AI 응답 완료 시점에만** DynamoDB에 저장
5. 사이드바 자동 새로고침

### 2. userId 관리
```javascript
// 일관된 userId 가져오기 (우선순위)
const userId = userInfo.userId || userInfo.email || userInfo.username || 'anonymous';
```

### 3. 메시지 형식 정규화
- Frontend: `type` 필드 사용 ("user", "assistant")
- Backend: `role` 필드 사용 ("user", "assistant")
- 양방향 호환성 유지

### 4. 캐시 전략
- localStorage 사용한 cache-first 로딩
- 캐시 키: `conv:{conversationId}`
- 새로고침 시에도 대화 유지

## 🛠️ 배포 스크립트

### Lambda 함수 배포
```bash
# Conversation API 배포
./deploy-conversation-lambda.sh

# WebSocket API 배포
./deploy-websocket-lambda-virginia.sh

# Usage API 배포
./deploy-usage-lambda.sh
```

### Frontend 배포
```bash
# S3 배포
./deploy-s3.sh

# CloudFront 생성
./create-cloudfront.sh
```

## 🐛 주요 이슈 해결 내역

### 1. 메시지 중복 전송 문제
- **원인**: `handleStartChat` 중복 호출
- **해결**: `isProcessingRef` 플래그로 중복 방지

### 2. 사이드바 대화 표시 안됨
- **원인**: userId 불일치 (저장: `ai@sedaily.com`, 조회: `b498b418-...`)
- **해결**: userId 가져오는 순서 통일

### 3. 대화 중복 저장
- **원인**: 여러 시점에서 저장 시도
- **해결**: AI 응답 완료 시점에만 저장

### 4. WebSocket 스트리밍 순서 문제
- **원인**: 청크 순서 뒤바뀜
- **해결**: `chunk_index` 기반 버퍼링 구현

## 📊 사용량 관리

### 토큰 제한
- T5 엔진: 150 토큰/일
- H8 엔진: 150 토큰/일

### 사용량 계산
```javascript
const tokensUsed = Math.ceil(inputLength / 4) + Math.ceil(outputLength / 4);
```

## 🔍 디버깅 도구

### 로그 확인
- Browser Console: 프론트엔드 로그
- CloudWatch Logs: Lambda 함수 로그

### 테스트 명령어
```bash
# 대화 목록 조회
curl -X GET "https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws/conversations?userId={userId}&engine=H8"

# 특정 대화 조회
curl -X GET "https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws/conversations/{conversationId}?userId={userId}"
```

## 📝 환경 변수

### Frontend (.env)
```
VITE_API_URL=https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws
VITE_WS_URL=wss://0zv5b3ekq5.execute-api.us-east-1.amazonaws.com/production
```

## 🚀 로컬 개발 환경

### Frontend 실행
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Backend 테스트
```bash
# Python 가상환경 설정
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 📌 주의사항

1. **userId 일관성**: 모든 서비스에서 동일한 userId 사용 확인
2. **대화 저장 시점**: AI 응답 완료 후에만 저장
3. **WebSocket 연결**: 페이지 이동 시 재연결 필요
4. **캐시 관리**: localStorage 용량 제한 주의 (5MB)
5. **CORS 설정**: Lambda 함수에 CORS 헤더 필수

## 🔒 보안 고려사항

1. **인증 토큰**: localStorage에 저장 (XSS 주의)
2. **API Key**: 환경 변수로 관리
3. **DynamoDB**: IAM 역할 기반 접근 제어
4. **Lambda**: 함수별 최소 권한 원칙

---

*마지막 업데이트: 2025-08-25*
*작성자: Claude Code Assistant*