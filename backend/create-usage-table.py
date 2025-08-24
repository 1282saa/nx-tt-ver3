#!/usr/bin/env python3
"""
DynamoDB 사용량 추적 테이블 생성 스크립트
테이블명: nx-tt-dev-ver3-usage-tracking
"""

import boto3
import json
from botocore.exceptions import ClientError

# DynamoDB 클라이언트 (버지니아 리전)
dynamodb = boto3.client('dynamodb', region_name='us-east-1')

def create_usage_table():
    """사용량 추적 테이블 생성"""
    try:
        table_name = 'nx-tt-dev-ver3-usage-tracking'
        
        # 테이블 생성 파라미터
        table_params = {
            'TableName': table_name,
            'KeySchema': [
                {
                    'AttributeName': 'PK',  # user#{userId}
                    'KeyType': 'HASH'  # 파티션 키
                },
                {
                    'AttributeName': 'SK',  # engine#{engineType}#{YYYY-MM}
                    'KeyType': 'RANGE'  # 소트 키
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'PK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'SK',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',  # 온디맨드 요금제
            'StreamSpecification': {
                'StreamEnabled': False
            },
            'SSESpecification': {
                'Enabled': True
            },
            'Tags': [
                {
                    'Key': 'Project',
                    'Value': 'Nexus'
                },
                {
                    'Key': 'Purpose',
                    'Value': 'Usage Tracking'
                },
                {
                    'Key': 'Environment',
                    'Value': 'Development'
                },
                {
                    'Key': 'Version',
                    'Value': 'ver3'
                }
            ]
        }
        
        print(f"🔧 DynamoDB 테이블 생성 중: {table_name}")
        
        response = dynamodb.create_table(**table_params)
        
        print("✅ 테이블 생성 요청 완료!")
        print(f"📋 테이블 ARN: {response['TableDescription']['TableArn']}")
        print(f"📊 테이블 상태: {response['TableDescription']['TableStatus']}")
        
        # 테이블 활성 상태 대기
        print("⏳ 테이블 활성화 대기 중...")
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(
            TableName=table_name,
            WaiterConfig={
                'Delay': 5,
                'MaxAttempts': 20
            }
        )
        
        # TTL 설정 (1년 후 자동 삭제)
        print("🕐 TTL 설정 중...")
        try:
            dynamodb.update_time_to_live(
                TableName=table_name,
                TimeToLiveSpecification={
                    'AttributeName': 'ttl',
                    'Enabled': True
                }
            )
            print("✅ TTL 설정 완료!")
        except Exception as e:
            print(f"⚠️ TTL 설정 실패 (수동 설정 필요): {e}")
        
        print("🎉 테이블 생성 및 활성화 완료!")
        
        # 샘플 데이터 삽입
        print("📝 샘플 데이터 삽입 중...")
        insert_sample_data(table_name)
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceInUseException':
            print("⚠️ 테이블이 이미 존재합니다.")
            return False
        else:
            print(f"❌ 테이블 생성 실패: {e}")
            return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
        return False

def insert_sample_data(table_name):
    """샘플 데이터 삽입"""
    try:
        import time
        current_timestamp = str(int(time.time()) + (365 * 24 * 60 * 60))
        
        # 관리자 계정 샘플 데이터
        sample_items = [
            {
                'PK': {'S': 'user#ai@sedaily.com'},
                'SK': {'S': 'engine#T5#2025-08'},
                'userId': {'S': 'ai@sedaily.com'},
                'engineType': {'S': 'T5'},
                'yearMonth': {'S': '2025-08'},
                'userPlan': {'S': 'premium'},
                'tokens': {
                    'M': {
                        'input': {'N': '0'},
                        'output': {'N': '0'},
                        'total': {'N': '0'}
                    }
                },
                'characters': {
                    'M': {
                        'input': {'N': '0'},
                        'output': {'N': '0'},
                        'total': {'N': '0'}
                    }
                },
                'messageCount': {'N': '0'},
                'dailyUsage': {'M': {}},
                'limits': {
                    'M': {
                        'monthlyTokens': {'N': '500000'},
                        'dailyMessages': {'N': '500'},
                        'maxTokensPerMessage': {'N': '4000'}
                    }
                },
                'createdAt': {'S': '2025-08-24T12:00:00Z'},
                'updatedAt': {'S': '2025-08-24T12:00:00Z'},
                'ttl': {'N': current_timestamp}
            },
            {
                'PK': {'S': 'user#ai@sedaily.com'},
                'SK': {'S': 'engine#H8#2025-08'},
                'userId': {'S': 'ai@sedaily.com'},
                'engineType': {'S': 'H8'},
                'yearMonth': {'S': '2025-08'},
                'userPlan': {'S': 'premium'},
                'tokens': {
                    'M': {
                        'input': {'N': '0'},
                        'output': {'N': '0'},
                        'total': {'N': '0'}
                    }
                },
                'characters': {
                    'M': {
                        'input': {'N': '0'},
                        'output': {'N': '0'},
                        'total': {'N': '0'}
                    }
                },
                'messageCount': {'N': '0'},
                'dailyUsage': {'M': {}},
                'limits': {
                    'M': {
                        'monthlyTokens': {'N': '500000'},
                        'dailyMessages': {'N': '500'},
                        'maxTokensPerMessage': {'N': '4000'}
                    }
                },
                'createdAt': {'S': '2025-08-24T12:00:00Z'},
                'updatedAt': {'S': '2025-08-24T12:00:00Z'},
                'ttl': {'N': current_timestamp}
            }
        ]
        
        for item in sample_items:
            dynamodb.put_item(
                TableName=table_name,
                Item=item
            )
            print(f"✅ 샘플 데이터 삽입: {item['PK']['S']} - {item['SK']['S']}")
        
        print("🎯 샘플 데이터 삽입 완료!")
        
    except Exception as e:
        print(f"⚠️ 샘플 데이터 삽입 실패: {e}")

def check_table_status(table_name):
    """테이블 상태 확인"""
    try:
        response = dynamodb.describe_table(TableName=table_name)
        table_info = response['TableDescription']
        
        print(f"📋 테이블 정보: {table_name}")
        print(f"   상태: {table_info['TableStatus']}")
        print(f"   아이템 수: {table_info.get('ItemCount', 'N/A')}")
        print(f"   크기: {table_info.get('TableSizeBytes', 'N/A')} bytes")
        print(f"   생성일: {table_info['CreationDateTime']}")
        
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(f"❌ 테이블이 존재하지 않습니다: {table_name}")
            return False
        else:
            print(f"❌ 테이블 상태 확인 실패: {e}")
            return False

if __name__ == "__main__":
    print("🚀 Nexus 사용량 추적 DynamoDB 테이블 설정")
    print("=" * 50)
    
    table_name = 'nx-tt-dev-ver3-usage-tracking'
    
    # 기존 테이블 확인
    if check_table_status(table_name):
        print("ℹ️ 테이블이 이미 존재합니다.")
        choice = input("다시 생성하시겠습니까? (y/N): ").lower()
        if choice == 'y':
            print("🗑️ 기존 테이블 삭제 중...")
            try:
                dynamodb.delete_table(TableName=table_name)
                print("⏳ 테이블 삭제 대기 중...")
                waiter = dynamodb.get_waiter('table_not_exists')
                waiter.wait(TableName=table_name)
                print("✅ 테이블 삭제 완료!")
            except Exception as e:
                print(f"❌ 테이블 삭제 실패: {e}")
                exit(1)
        else:
            print("🔄 기존 테이블을 유지합니다.")
            exit(0)
    
    # 새 테이블 생성
    if create_usage_table():
        print("\n🎉 DynamoDB 사용량 추적 테이블 설정 완료!")
        print(f"\n📋 테이블명: {table_name}")
        print("\n다음 단계:")
        print("1. Lambda 함수 배포")
        print("2. API Gateway 설정") 
        print("3. 프론트엔드 테스트")
    else:
        print("\n❌ 테이블 설정 실패!")
        exit(1)