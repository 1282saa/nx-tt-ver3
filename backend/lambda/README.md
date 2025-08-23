# Lambda Functions - nx-tt-dev-ver3

뉴스 제목 생성 서비스의 백엔드 Lambda 함수들

## 📁 폴더 구조

```
lambda/
├── rest-api/           # REST API Lambda 함수들
│   ├── prompt_crud_handler.py         # 프롬프트/파일 CRUD 처리
│   ├── prompt_crud_handler_old.py     # 백업 (이전 버전)
│   └── legacy_lambda_handler.py       # 레거시 핸들러
│
├── websocket/          # WebSocket API Lambda 함수들
│   ├── websocket_connect_handler.py      # WebSocket 연결 처리
│   ├── websocket_disconnect_handler.py   # WebSocket 연결 해제 처리
│   └── websocket_message_handler.py      # 채팅 메시지 처리 (AI 스트리밍)
│
├── shared/             # 공통 라이브러리
│   ├── __init__.py
│   ├── dynamodb_client.py      # DynamoDB 클라이언트 설정
│   └── response_utils.py       # HTTP 응답 유틸리티
│
├── deployments/        # 배포 스크립트들
│   ├── deploy-rest-api.sh      # REST API 배포
│   ├── deploy-websocket-api.sh # WebSocket API 배포
│   ├── deploy-all.sh           # 전체 배포
│   └── *.zip                   # 배포 패키지들
│
└── README.md           # 이 파일
```

## 🚀 배포

### 전체 배포
```bash
cd deployments/
./deploy-all.sh
```

### 개별 배포
```bash
# REST API만 배포
./deploy-rest-api.sh

# WebSocket API만 배포  
./deploy-websocket-api.sh
```

## 📡 API 엔드포인트

### REST API (CRUD 관리)
- **엔드포인트**: `https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com`
- **용도**: 프롬프트 및 파일 CRUD 작업
- **Lambda 함수**: `nx-tt-dev-ver3-prompt-crud`

### WebSocket API (실시간 채팅)
- **엔드포인트**: `wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod`
- **용도**: 실시간 채팅 및 AI 응답 스트리밍
- **Lambda 함수들**:
  - `nx-tt-dev-ver3-websocket-connect`
  - `nx-tt-dev-ver3-websocket-disconnect`
  - `nx-tt-dev-ver3-websocket-message`

## 🗄️ DynamoDB 테이블

- `nx-tt-dev-ver3-prompts`: 프롬프트 데이터 (T5, H8 엔진별)
- `nx-tt-dev-ver3-files`: 파일 데이터 (엔진별)
- `nx-tt-dev-ver3-websocket-connections`: WebSocket 연결 관리

## 💡 개발 가이드

### 새 Lambda 함수 추가 시
1. 적절한 폴더 (`rest-api/` 또는 `websocket/`)에 핸들러 파일 생성
2. `shared/` 라이브러리 사용 (import 경로 설정)
3. `deployments/` 폴더에 배포 스크립트 업데이트

### 공통 라이브러리 사용
```python
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))

from dynamodb_client import prompts_table, files_table, connections_table
from response_utils import create_success_response, create_error_response
```

### 테스트
```bash
# REST API 테스트
curl -X GET https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com/prompts/T5

# WebSocket 테스트 (브라우저 개발자 도구에서)
const ws = new WebSocket('wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod');
ws.send(JSON.stringify({
  "action": "sendMessage",
  "message": "테스트 메시지",
  "engineType": "T5"
}));
```

## 🔧 트러블슈팅

### 배포 실패 시
1. AWS CLI 설정 확인
2. IAM 권한 확인
3. 공유 라이브러리 import 경로 확인

### Lambda 함수 로그 확인
```bash
aws logs tail /aws/lambda/[함수명] --follow --region us-east-1
```