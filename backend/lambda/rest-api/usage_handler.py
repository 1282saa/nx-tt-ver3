"""
간단한 사용량 추적 Lambda 함수 (최소 기능 버전)
- 토큰 카운트만 추적
- 복잡한 구조 제거
- 에러 최소화
"""

import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal
import logging
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
import os
from urllib.parse import unquote

# 로깅 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB 초기화
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
usage_table = dynamodb.Table('nx-tt-dev-ver3-usage-tracking')

# CORS 헤더
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
}

def decimal_to_float(obj):
    """DynamoDB Decimal을 float로 변환"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(v) for v in obj]
    return obj

def estimate_tokens(text):
    """토큰 추정 (한글/영어 구분)"""
    if not text:
        return 0
    
    # 문자 타입별 카운트
    korean_chars = 0
    english_chars = 0
    numbers = 0
    spaces = 0
    
    for char in text:
        if '가' <= char <= '힣':
            korean_chars += 1
        elif char.isalpha() and char.isascii():
            english_chars += 1
        elif char.isdigit():
            numbers += 1
        elif char.isspace():
            spaces += 1
    
    # 나머지 특수문자
    special_chars = len(text) - korean_chars - english_chars - numbers - spaces
    
    # 토큰 계산 (경험적 수치)
    # Claude 기준 근사치
    korean_tokens = korean_chars / 2.5  # 한글 2.5자당 1토큰
    english_tokens = english_chars / 4  # 영어 4자당 1토큰  
    number_tokens = numbers / 3.5       # 숫자 3.5자당 1토큰
    space_tokens = spaces / 4           # 공백 4개당 1토큰
    special_tokens = special_chars / 3  # 특수문자 3자당 1토큰
    
    total_tokens = (korean_tokens + english_tokens + 
                   number_tokens + space_tokens + special_tokens)
    
    return max(1, int(total_tokens))

def get_or_create_usage(user_id, engine_type):
    """사용량 조회 또는 생성"""
    year_month = datetime.now(timezone.utc).strftime('%Y-%m')
    pk = f"user#{user_id}"
    sk = f"engine#{engine_type}#{year_month}"
    
    try:
        # 먼저 조회
        response = usage_table.get_item(
            Key={'PK': pk, 'SK': sk}
        )
        
        if 'Item' in response:
            return response['Item']
        
        # 없으면 새로 생성
        new_item = {
            'PK': pk,
            'SK': sk,
            'userId': user_id,
            'engineType': engine_type,
            'yearMonth': year_month,
            'totalTokens': Decimal('0'),
            'inputTokens': Decimal('0'),
            'outputTokens': Decimal('0'),
            'messageCount': Decimal('0'),
            'createdAt': datetime.now(timezone.utc).isoformat(),
            'updatedAt': datetime.now(timezone.utc).isoformat()
        }
        
        usage_table.put_item(Item=new_item)
        return new_item
        
    except ClientError as e:
        logger.error(f"Error getting/creating usage: {e}")
        raise

def update_usage(user_id, engine_type, input_text, output_text):
    """사용량 업데이트 (간단 버전)"""
    try:
        # 토큰 계산
        input_tokens = estimate_tokens(input_text)
        output_tokens = estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        
        year_month = datetime.now(timezone.utc).strftime('%Y-%m')
        pk = f"user#{user_id}"
        sk = f"engine#{engine_type}#{year_month}"
        
        # 먼저 레코드 확인/생성
        get_or_create_usage(user_id, engine_type)
        
        # 간단한 업데이트 (ADD 사용으로 원자적 증가)
        response = usage_table.update_item(
            Key={'PK': pk, 'SK': sk},
            UpdateExpression="""
                ADD totalTokens :total,
                    inputTokens :input,
                    outputTokens :output,
                    messageCount :one
                SET updatedAt = :timestamp,
                    lastUsedAt = :timestamp
            """,
            ExpressionAttributeValues={
                ':total': Decimal(str(total_tokens)),
                ':input': Decimal(str(input_tokens)),
                ':output': Decimal(str(output_tokens)),
                ':one': Decimal('1'),
                ':timestamp': datetime.now(timezone.utc).isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        updated_item = decimal_to_float(response['Attributes'])
        
        # 간단한 사용률 계산 (월 10,000 토큰 기준)
        monthly_limit = 10000
        percentage = min(100, (updated_item['totalTokens'] / monthly_limit) * 100)
        
        return {
            'success': True,
            'usage': updated_item,
            'tokensUsed': total_tokens,
            'percentage': round(percentage, 1),
            'remaining': max(0, monthly_limit - updated_item['totalTokens'])
        }
        
    except ClientError as e:
        logger.error(f"사용량 업데이트 실패: {e}")
        return {'success': False, 'error': str(e)}

def get_usage(user_id, engine_type):
    """사용량 조회"""
    try:
        year_month = datetime.now(timezone.utc).strftime('%Y-%m')
        pk = f"user#{user_id}"
        sk = f"engine#{engine_type}#{year_month}"
        
        response = usage_table.get_item(
            Key={'PK': pk, 'SK': sk}
        )
        
        if 'Item' in response:
            return decimal_to_float(response['Item'])
        
        # 없으면 기본값 반환
        return {
            'userId': user_id,
            'engineType': engine_type,
            'yearMonth': year_month,
            'totalTokens': 0,
            'inputTokens': 0,
            'outputTokens': 0,
            'messageCount': 0
        }
        
    except ClientError as e:
        logger.error(f"사용량 조회 실패: {e}")
        return None

def get_all_usage(user_id):
    """모든 엔진의 사용량 조회"""
    try:
        pk = f"user#{user_id}"
        
        # Key 조건 사용 (GPT 피드백 반영)
        response = usage_table.query(
            KeyConditionExpression=Key('PK').eq(pk)
        )
        
        items = [decimal_to_float(item) for item in response.get('Items', [])]
        
        # 엔진별로 정리
        usage_by_engine = {}
        for item in items:
            engine_type = item.get('engineType', 'unknown')
            year_month = item.get('yearMonth', '')
            
            if engine_type not in usage_by_engine:
                usage_by_engine[engine_type] = []
            
            usage_by_engine[engine_type].append(item)
        
        # 각 엔진별로 월별 정렬
        for engine in usage_by_engine:
            usage_by_engine[engine].sort(key=lambda x: x.get('yearMonth', ''), reverse=True)
        
        return usage_by_engine
        
    except ClientError as e:
        logger.error(f"전체 사용량 조회 실패: {e}")
        return {}

def lambda_handler(event, context):
    """Lambda 메인 핸들러"""
    try:
        logger.info(f"Event: {json.dumps(event)}")
        
        # CORS preflight 요청 처리
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        path_parameters = event.get('pathParameters') or {}
        http_method = event.get('httpMethod')
        body = event.get('body')
        
        if http_method == 'GET':
            user_id = path_parameters.get('userId')
            engine_type_or_all = path_parameters.get('engineType')
            
            # URL 디코딩 처리 (이메일의 @ 등)
            if user_id:
                user_id = unquote(user_id)
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'userId 필수'})
                }
            
            if engine_type_or_all == 'all':
                # 전체 사용량 조회
                data = get_all_usage(user_id)
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'success': True, 'data': data})
                }
            else:
                # 특정 엔진 사용량 조회
                data = get_usage(user_id, engine_type_or_all)
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'success': True, 'data': data})
                }
        
        elif http_method == 'POST':
            if not body:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Request body 필수'})
                }
            
            data = json.loads(body)
            user_id = data.get('userId')
            engine_type = data.get('engineType')
            input_text = data.get('inputText', '')
            output_text = data.get('outputText', '')
            
            if not all([user_id, engine_type]):
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'userId, engineType 필수'})
                }
            
            result = update_usage(user_id, engine_type, input_text, output_text)
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(result)
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': '지원하지 않는 HTTP 메서드'})
            }
            
    except Exception as e:
        logger.error(f"Lambda 핸들러 오류: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': '서버 내부 오류'})
        }