#!/bin/bash

# DynamoDB Conversations 테이블 생성 스크립트

TABLE_NAME="Conversations"
REGION="ap-northeast-2"

echo "Creating DynamoDB table: $TABLE_NAME"

aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=conversationId,AttributeType=S \
        AttributeName=updatedAt,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=conversationId,KeyType=RANGE \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"UpdatedAtIndex\",
                \"KeySchema\": [
                    {\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"},
                    {\"AttributeName\":\"updatedAt\",\"KeyType\":\"RANGE\"}
                ],
                \"Projection\": {
                    \"ProjectionType\": \"ALL\"
                },
                \"ProvisionedThroughput\": {
                    \"ReadCapacityUnits\": 5,
                    \"WriteCapacityUnits\": 5
                }
            }
        ]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION

echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

echo "Table status:"
aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.TableStatus' --output text

echo "Conversations table created successfully!"