# 1 bedrock_client_enhanced.py:

deploy-websocket-lambda-with-enhanced.sh

1. 파일 패키징: bedrock_client_enhanced.py를 포함한 Lambda 코드를 ZIP으로 압축
2. AWS 업로드: us-east-1 리전의 nx-tt-dev-ver3-websocket-message Lambda 함수 업데이트
3. 설정 적용: 타임아웃 60초, 메모리 512MB 설정

# forntend deployment (npm run build, s3 sync)

Bash(cd /Users/yeong-gwang/Documents/work/서울경제신문/DEV/Sedailyio/Nexus_first_title/nexus_0822/frontend && npm run build && aws s3 sync dist/
s3://nx-tt-dev-ver3-fronte…)

aws cloudfront create-invalidation --distribution-id EIYU5SFVTHQMN --paths "/\*"  
 "Location": "https://cloudfront.amazonaws.com/2020-05-31/distribution/EIYU5SFVTHQMN/invalidation/I5K9C2SS9CQ6TPLRPSJJSI5M6Z",
"Invalidation": {

# 대화기록 업데이트 스크립트(쓰레드 메시지) )

Bash(cd /Users/yeong-gwang/Documents/work/서울경제신문/DEV/Sedailyio/Nexus_first_title/nexus_0822/backend && ./deploy-conversation-lambda-virginia.sh 2>&1 | tail -10)
