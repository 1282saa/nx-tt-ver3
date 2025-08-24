"""
사용량 추적 Lambda 함수
- GET /usage/{userId}/{engineType} - 사용량 조회
- POST /usage/update - 사용량 업데이트
- GET /usage/{userId}/all - 전체 사용량 조회
"""

import json
import boto3
from datetime import datetime, timezone
from decimal import Decimal
import logging
from botocore.exceptions import ClientError
import os

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

def get_usage_pk(user_id):
    return f"user#{user_id}"

def get_usage_sk(engine_type, year_month=None):
    if not year_month:
        year_month = datetime.now(timezone.utc).strftime('%Y-%m')
    return f"engine#{engine_type}#{year_month}"

def get_current_timestamp():
    return datetime.now(timezone.utc).isoformat()

def get_ttl_timestamp():
    """1년 후 TTL 타임스탬프"""
    import time
    return int(time.time()) + (365 * 24 * 60 * 60)

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

def estimate_tokens(text):
    """토큰 수 추정"""
    if not text:
        return 0
    
    korean_chars = len([c for c in text if '\uac00' <= c <= '\ud7a3'])
    english_chars = len([c for c in text if c.isalpha() and c.isascii()])
    other_chars = len(text) - korean_chars - english_chars
    
    korean_tokens = max(1, korean_chars // 3)  # 한글 3자당 1토큰
    english_tokens = max(1, english_chars // 4)  # 영어 4자당 1토큰
    other_tokens = max(1, other_chars // 3)
    
    return korean_tokens + english_tokens + other_tokens

def get_user_usage(user_id, engine_type, year_month=None):
    """사용자의 특정 엔진 사용량 조회"""
    try:
        pk = get_usage_pk(user_id)
        sk = get_usage_sk(engine_type, year_month)
        
        response = usage_table.get_item(
            Key={'PK': pk, 'SK': sk}
        )
        
        if 'Item' in response:
            return decimal_to_float(response['Item'])
        
        # 데이터가 없으면 초기값 반환
        return create_initial_usage_data(user_id, engine_type, 'free')
        
    except ClientError as e:
        logger.error(f"사용량 조회 실패: {e}")
        return None

def create_initial_usage_data(user_id, engine_type, user_plan='free'):
    """초기 사용량 데이터 생성"""
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS['free']).get(engine_type, PLAN_LIMITS['free']['T5'])
    
    return {
        'PK': get_usage_pk(user_id),
        'SK': get_usage_sk(engine_type, current_month),
        'userId': user_id,
        'engineType': engine_type,
        'yearMonth': current_month,
        'userPlan': user_plan,
        'tokens': {'input': 0, 'output': 0, 'total': 0},
        'characters': {'input': 0, 'output': 0, 'total': 0},
        'messageCount': 0,
        'dailyUsage': {},
        'limits': limits,
        'firstUsedAt': None,
        'lastUsedAt': None,
        'createdAt': get_current_timestamp(),
        'updatedAt': get_current_timestamp(),
        'ttl': get_ttl_timestamp()
    }

def update_user_usage(user_id, engine_type, input_text, output_text, user_plan='free'):
    """사용량 업데이트"""
    try:
        # 토큰 계산
        input_tokens = estimate_tokens(input_text)
        output_tokens = estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        
        input_chars = len(input_text) if input_text else 0
        output_chars = len(output_text) if output_text else 0
        
        current_month = datetime.now(timezone.utc).strftime('%Y-%m')
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        timestamp = get_current_timestamp()
        
        pk = get_usage_pk(user_id)
        sk = get_usage_sk(engine_type, current_month)
        
        # 현재 데이터 조회
        current_data = get_user_usage(user_id, engine_type, current_month)
        if not current_data:
            current_data = create_initial_usage_data(user_id, engine_type, user_plan)
        
        # 사용량 제한 체크
        limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS['free']).get(engine_type, PLAN_LIMITS['free']['T5'])
        
        if current_data['tokens']['total'] + total_tokens > limits['monthlyTokens']:
            return {
                'success': False,
                'error': '월간 토큰 한도 초과',
                'remaining': max(0, limits['monthlyTokens'] - current_data['tokens']['total'])
            }
        
        # 일일 사용량 체크
        today_usage = current_data.get('dailyUsage', {}).get(today, {'tokens': 0, 'messages': 0, 'characters': 0})
        if today_usage['messages'] >= limits['dailyMessages']:
            return {
                'success': False,
                'error': '일일 메시지 한도 초과'
            }
        
        # 업데이트 표현식 구성 (예약어 대응)
        # 중첩된 경로는 개별적으로 업데이트
        update_expression = """
        SET 
        userId = if_not_exists(userId, :user_id),
        engineType = if_not_exists(engineType, :engine_type),
        yearMonth = if_not_exists(yearMonth, :year_month),
        createdAt = if_not_exists(createdAt, :timestamp),
        messageCount = if_not_exists(messageCount, :zero) + :one,
        tokens.#input = if_not_exists(tokens.#input, :zero) + :input_tokens,
        tokens.#output = if_not_exists(tokens.#output, :zero) + :output_tokens,
        tokens.#total = if_not_exists(tokens.#total, :zero) + :total_tokens,
        characters.#input = if_not_exists(characters.#input, :zero) + :input_chars,
        characters.#output = if_not_exists(characters.#output, :zero) + :output_chars,
        characters.#total = if_not_exists(characters.#total, :zero) + :total_chars,
        dailyUsage.#today.tokens = if_not_exists(dailyUsage.#today.tokens, :zero) + :total_tokens,
        dailyUsage.#today.messages = if_not_exists(dailyUsage.#today.messages, :zero) + :one,
        dailyUsage.#today.characters = if_not_exists(dailyUsage.#today.characters, :zero) + :total_chars,
        lastUsedAt = :timestamp,
        updatedAt = :timestamp,
        firstUsedAt = if_not_exists(firstUsedAt, :timestamp),
        userPlan = :user_plan,
        #limits = :limits,
        #ttl = :ttl_value
        """
        
        expression_values = {
            ':input_tokens': Decimal(str(input_tokens)),
            ':output_tokens': Decimal(str(output_tokens)),
            ':total_tokens': Decimal(str(total_tokens)),
            ':input_chars': Decimal(str(input_chars)),
            ':output_chars': Decimal(str(output_chars)),
            ':total_chars': Decimal(str(input_chars + output_chars)),
            ':one': Decimal('1'),
            ':zero': Decimal('0'),
            ':timestamp': timestamp,
            ':user_plan': user_plan,
            ':limits': limits,
            ':ttl_value': get_ttl_timestamp(),
            ':user_id': user_id,
            ':engine_type': engine_type,
            ':year_month': current_month
        }
        
        expression_names = {
            '#today': today,
            '#input': 'input',
            '#output': 'output',
            '#total': 'total',
            '#limits': 'limits',
            '#ttl': 'ttl'
        }
        
        # DynamoDB 업데이트
        response = usage_table.update_item(
            Key={'PK': pk, 'SK': sk},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names,
            ReturnValues='ALL_NEW'
        )
        
        updated_item = decimal_to_float(response['Attributes'])
        
        # 사용량 퍼센티지 계산
        percentage = min(100, (updated_item['tokens']['total'] / limits['monthlyTokens']) * 100)
        
        return {
            'success': True,
            'usage': updated_item,
            'percentage': round(percentage, 1),
            'tokensUsed': total_tokens,
            'remaining': max(0, limits['monthlyTokens'] - updated_item['tokens']['total'])
        }
        
    except ClientError as e:
        logger.error(f"사용량 업데이트 실패: {e}")
        return {'success': False, 'error': str(e)}

def get_all_user_usage(user_id):
    """사용자의 모든 엔진 사용량 조회"""
    try:
        pk = get_usage_pk(user_id)
        
        response = usage_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={':pk': pk}
        )
        
        items = [decimal_to_float(item) for item in response.get('Items', [])]
        
        # 엔진별로 정리
        usage_data = {}
        for item in items:
            engine_type = item['engineType']
            usage_data[engine_type] = item
            
        return usage_data
        
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
        
        # 경로 파라미터 추출
        path_parameters = event.get('pathParameters') or {}
        http_method = event.get('httpMethod')
        body = event.get('body')
        
        if http_method == 'GET':
            # GET /usage/{userId}/{engineType} 또는 GET /usage/{userId}/all
            user_id = path_parameters.get('userId')
            engine_type_or_all = path_parameters.get('engineType')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'userId 필수'})
                }
            
            if engine_type_or_all == 'all':
                # 전체 사용량 조회
                usage_data = get_all_user_usage(user_id)
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'success': True, 'data': usage_data})
                }
            else:
                # 특정 엔진 사용량 조회
                usage_data = get_user_usage(user_id, engine_type_or_all)
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'success': True, 'data': usage_data})
                }
        
        elif http_method == 'POST':
            # POST /usage/update
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
            user_plan = data.get('userPlan', 'free')
            
            if not all([user_id, engine_type]):
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'userId, engineType 필수'})
                }
            
            result = update_user_usage(user_id, engine_type, input_text, output_text, user_plan)
            
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