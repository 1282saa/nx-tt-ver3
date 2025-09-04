"""
DynamoDB Usage Tracking Schema

Table Name: nexus-usage-tracking

Primary Key Structure:
- PK (Partition Key): user#{userId}
- SK (Sort Key): engine#{engineType}#{YYYY-MM}

Example:
- PK: user#ai@sedaily.com
- SK: engine#T5#2025-08
"""

import boto3
from datetime import datetime, timezone
from decimal import Decimal
import json

# DynamoDB 클라이언트 초기화
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
usage_table = dynamodb.Table('nx-tt-dev-ver3-usage-tracking')

def get_usage_pk(user_id):
    """사용자 파티션 키 생성"""
    return f"user#{user_id}"

def get_usage_sk(engine_type, year_month=None):
    """엔진별 소트 키 생성"""
    if not year_month:
        year_month = datetime.now(timezone.utc).strftime('%Y-%m')
    return f"engine#{engine_type}#{year_month}"

def get_current_month():
    """현재 연월 반환 (YYYY-MM)"""
    return datetime.now(timezone.utc).strftime('%Y-%m')

def get_today():
    """오늘 날짜 반환 (YYYY-MM-DD)"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

# DynamoDB 아이템 구조
USAGE_ITEM_SCHEMA = {
    'PK': 'user#email@example.com',  # 파티션 키
    'SK': 'engine#T5#2025-08',       # 소트 키
    'userId': 'email@example.com',
    'engineType': 'T5',              # T5, H8
    'yearMonth': '2025-08',
    'userPlan': 'free',              # free, basic, premium
    'tokens': {
        'input': 0,
        'output': 0,
        'total': 0
    },
    'characters': {
        'input': 0,
        'output': 0,
        'total': 0
    },
    'messageCount': 0,
    'dailyUsage': {
        '2025-08-24': {
            'tokens': 45,
            'messages': 3,
            'characters': 120
        }
    },
    'limits': {
        'monthlyTokens': 10000,
        'dailyMessages': 20,
        'maxTokensPerMessage': 1000
    },
    'firstUsedAt': '2025-08-24T09:15:00Z',
    'lastUsedAt': '2025-08-24T09:45:00Z',
    'createdAt': '2025-08-24T09:15:00Z',
    'updatedAt': '2025-08-24T09:45:00Z',
    'ttl': 1735689600  # 1년 후 자동 삭제
}

# 플랜별 제한 설정
PLAN_LIMITS = {
    'free': {
        'T5': {'monthlyTokens': 10000, 'dailyMessages': 20, 'maxTokensPerMessage': 1000},
        'H8': {'monthlyTokens': 10000, 'dailyMessages': 20, 'maxTokensPerMessage': 1000}
    },
    'basic': {
        'T5': {'monthlyTokens': 100000, 'dailyMessages': 100, 'maxTokensPerMessage': 2000},
        'H8': {'monthlyTokens': 100000, 'dailyMessages': 100, 'maxTokensPerMessage': 2000}
    },
    'premium': {
        'T5': {'monthlyTokens': 500000, 'dailyMessages': 500, 'maxTokensPerMessage': 4000},
        'H8': {'monthlyTokens': 500000, 'dailyMessages': 500, 'maxTokensPerMessage': 4000}
    }
}