#!/bin/bash

# Test usage update directly
USER_ID="ttrhtt12@gmail.com"
API_URL="https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod"

echo "Testing Usage Update API..."
echo "================================"

# Test updating usage
curl -X POST "${API_URL}/usage/update" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "engineType": "T5",
    "inputText": "안녕하세요, 테스트 메시지입니다.",
    "outputText": "안녕하세요! 테스트 응답입니다. 무엇을 도와드릴까요?"
  }' | python3 -m json.tool

echo -e "\n================================"
echo "Now checking updated usage:"

# Check T5 usage after update
curl -s "${API_URL}/usage/${USER_ID}/T5" | python3 -m json.tool

echo -e "\n================================"
echo "Test complete!"