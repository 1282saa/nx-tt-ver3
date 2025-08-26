#!/bin/bash

# Test user email (URL encoded)
USER_ID="ttrhtt12%40gmail.com"
API_URL="https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod"

echo "Testing Usage API endpoints..."
echo "================================"

# Test T5 engine
echo -e "\n1. Testing T5 engine usage:"
curl -s "${API_URL}/usage/${USER_ID}/T5" | python3 -m json.tool

# Test H8 engine  
echo -e "\n2. Testing H8 engine usage:"
curl -s "${API_URL}/usage/${USER_ID}/H8" | python3 -m json.tool

echo -e "\n================================"
echo "Test complete!"
