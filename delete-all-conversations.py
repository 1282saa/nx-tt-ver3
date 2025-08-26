#!/usr/bin/env python3
import boto3
import json

# DynamoDB 클라이언트 생성
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('nx-tt-dev-ver3-conversations')

print("🗑️ 모든 대화 삭제 시작...")

# 모든 항목 스캔
response = table.scan()
items = response['Items']

# 페이지네이션 처리
while 'LastEvaluatedKey' in response:
    response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
    items.extend(response['Items'])

print(f"📊 총 {len(items)}개 대화 발견")

# 각 항목 삭제
deleted_count = 0
for item in items:
    try:
        table.delete_item(
            Key={
                'conversationId': item['conversationId']
            }
        )
        deleted_count += 1
        print(f"❌ 삭제: {item['conversationId']} (userId: {item.get('userId', 'unknown')})")
    except Exception as e:
        print(f"⚠️ 삭제 실패: {item['conversationId']} - {str(e)}")

print(f"\n✅ 삭제 완료: {deleted_count}/{len(items)}개 대화")