#!/bin/bash

echo "🚀 Claude Interface Clone 시작하기"
echo "================================"

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

echo "🔥 개발 서버 시작 중..."
echo "브라우저에서 http://localhost:3000 이 자동으로 열립니다."
echo ""
echo "개발 서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

npm run dev
