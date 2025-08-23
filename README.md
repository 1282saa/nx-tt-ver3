# nx-tt-dev-ver3 - Nexus Title Generation Service

AI 기반 뉴스 제목 생성 서비스 (Claude Sonnet 4 활용)

## 🚀 프로젝트 구조

```
nx-tt-dev-ver3/
├── frontend/                # 프론트엔드 애플리케이션
│   ├── src/                # React 소스 코드
│   │   ├── components/     # React 컴포넌트
│   │   └── services/       # API 서비스
│   ├── public/             # 정적 파일
│   ├── index.html          # HTML 엔트리
│   ├── vite.config.js      # Vite 설정
│   ├── tailwind.config.js  # Tailwind CSS 설정
│   └── package.json        # 프론트엔드 의존성
│
├── backend/                 # 백엔드 서버리스 함수
│   ├── lambda_handler.py   # Lambda 핸들러
│   ├── template.yaml       # SAM 템플릿
│   └── test_real_article.py # 테스트 스크립트
│
└── package.json            # 루트 패키지 (프로젝트 전체 스크립트)
```

## 🌟 주요 기능

- **AI 제목 생성**: Claude Sonnet 4를 활용한 10개 제목 자동 생성
- **실시간 처리**: AWS Lambda를 통한 빠른 응답
- **반응형 UI**: 모든 디바이스에서 최적화된 사용자 경험
- **제목 복사**: 개별 제목 클립보드 복사 기능
- **로딩 상태**: 생성 중 시각적 피드백

## 🛠️ 기술 스택

### Frontend
- **React 18**: 최신 React 훅과 기능 활용
- **Vite**: 빠른 개발 서버와 빌드 도구  
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **Lucide React**: 아이콘 라이브러리

### Backend
- **AWS Lambda**: 서버리스 컴퓨팅 (Python 3.11)
- **AWS Bedrock**: Claude Sonnet 4 모델 호출
- **AWS API Gateway**: RESTful API 엔드포인트
- **AWS IAM**: 보안 및 권한 관리

## 📦 설치 및 실행

### 1. 프론트엔드 의존성 설치

```bash
npm run install:frontend
```

### 2. 개발 서버 실행

```bash
npm run dev  # 프론트엔드 개발 서버 (포트 3000)
```

### 3. 백엔드 테스트

```bash
npm run test:backend  # 로컬에서 Lambda 함수 테스트
```

### 4. 프론트엔드 빌드

```bash
npm run build:frontend
```

## ☁️ AWS 리소스 (nx-tt-dev-ver3 prefix)

- **Lambda Function**: `nx-tt-dev-ver3-title-generation`
- **API Gateway**: `nx-tt-dev-ver3-api`
- **IAM Role**: `nx-tt-dev-ver3-lambda-role`
- **IAM Policy**: `nx-tt-dev-ver3-bedrock-policy`
- **API Endpoint**: `https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod/generate-titles`

## ⚙️ 환경 설정

### 프론트엔드 환경 변수 (frontend/.env.development)

```env
VITE_API_URL=https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod
VITE_USE_MOCK=false  # true: Mock 데이터 사용, false: 실제 API 사용
```

## 🎨 주요 컴포넌트

### Sidebar

- 토글 가능한 확장/축소 기능
- 새 채팅 버튼
- 네비게이션 링크 (채팅, 프로젝트, 아티팩트)
- 즐겨찾기 및 최근 대화 목록
- 사용자 메뉴

### MainContent

- 프로젝트 헤더 (제목, 별표, 더보기)
- 채팅 입력 영역
- 환영 메시지

### ChatInput

- 자동 크기 조절 텍스트 영역
- 첨부파일, 도구, 검색 버튼
- 모델 선택기 (Claude Sonnet 4)
- 전송 버튼 (메시지 입력 시 활성화)

### RightPanel

- 지침 설정 섹션
- 파일 업로드 기능
- 업로드된 파일 목록 표시

## 🎯 주요 기능

1. **사이드바 토글**: 클릭으로 사이드바 확장/축소
2. **파일 업로드**: 드래그 앤 드롭 또는 클릭으로 파일 업로드
3. **채팅 입력**: Enter 키로 메시지 전송 (Shift+Enter로 줄바꿈)
4. **즐겨찾기**: 프로젝트 별표 토글
5. **반응형**: 모든 화면 크기에서 완벽한 레이아웃

## 🎨 디자인 시스템

### 색상 팔레트

- **배경**: `bg-100` ~ `bg-400` (어두운 회색 톤)
- **텍스트**: `text-100` ~ `text-500` (밝은 회색 톤)
- **강조색**: `accent-main-000` ~ `accent-main-200` (오렌지 톤)
- **경계선**: `border-300`, `border-400`

### 애니메이션

- **트랜지션**: `cubic-bezier(0.165, 0.85, 0.45, 1)` (Claude 스타일)
- **페이드인**: 컴포넌트 로드 시 부드러운 등장
- **호버 효과**: 버튼과 링크에 미묘한 상호작용

## 🔧 커스터마이징

### 색상 변경

`tailwind.config.js`에서 색상 팔레트를 수정할 수 있습니다.

### 컴포넌트 수정

각 컴포넌트는 독립적으로 수정 가능하며, props를 통해 데이터를 전달받습니다.

### 새 기능 추가

- `src/components/` 폴더에 새 컴포넌트 추가
- `App.jsx`에서 상태 관리 및 컴포넌트 연결

## 📝 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🤝 기여

이슈 리포트나 기능 제안은 언제든 환영합니다!
