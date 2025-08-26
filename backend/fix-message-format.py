#!/usr/bin/env python3
"""
기존 대화의 메시지 형식을 수정하는 스크립트
role 필드를 기반으로 type 필드 추가
"""

import boto3
import json

# DynamoDB 설정
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('nx-tt-dev-ver3-conversations')

def fix_message_format():
    """모든 대화의 메시지 형식 수정"""
    
    # 모든 대화 스캔
    response = table.scan()
    items = response.get('Items', [])
    
    fixed_count = 0
    
    for item in items:
        if 'messages' in item:
            needs_update = False
            
            # 각 메시지 확인
            for msg in item['messages']:
                # type 필드가 없고 role 필드가 있으면 추가
                if 'role' in msg and 'type' not in msg:
                    msg['type'] = 'user' if msg['role'] == 'user' else 'assistant'
                    needs_update = True
                # role 필드가 없고 type 필드가 있으면 추가 (역호환성)
                elif 'type' in msg and 'role' not in msg:
                    msg['role'] = 'user' if msg['type'] == 'user' else 'assistant'
                    needs_update = True
            
            # 업데이트 필요한 경우
            if needs_update:
                try:
                    table.update_item(
                        Key={'conversationId': item['conversationId']},
                        UpdateExpression='SET messages = :msgs',
                        ExpressionAttributeValues={
                            ':msgs': item['messages']
                        }
                    )
                    fixed_count += 1
                    print(f"✅ Fixed conversation: {item['conversationId']}")
                except Exception as e:
                    print(f"❌ Error fixing conversation {item['conversationId']}: {str(e)}")
    
    print(f"\n총 {fixed_count}개 대화 수정 완료")

if __name__ == "__main__":
    fix_message_format()