"""
Conversation REST API Handler
DynamoDB 대화 저장/조회 API
"""

import json
import boto3
from datetime import datetime
from decimal import Decimal
import logging
from boto3.dynamodb.conditions import Key, Attr
import uuid

# 로깅 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB 초기화
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
conversations_table = dynamodb.Table('nx-tt-dev-ver3-conversations')

# CORS 헤더 - Lambda Function URL이 자동으로 처리하므로 제거
CORS_HEADERS = {
    # Lambda Function URL이 CORS를 자동 처리하므로 중복 방지
    'Content-Type': 'application/json'
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

def lambda_handler(event, context):
    """메인 핸들러"""
    try:
        logger.info(f"Event: {json.dumps(event)}")
        
        # Lambda Function URL과 API Gateway 형식 모두 지원
        if 'requestContext' in event and 'http' in event['requestContext']:
            # Lambda Function URL 형식
            method = event['requestContext']['http']['method']
            path = event['requestContext']['http']['path']
            query_params = event.get('queryStringParameters') or {}
            path_params = {}
        else:
            # API Gateway 형식
            method = event.get('httpMethod', '')
            path = event.get('path', '')
            path_params = event.get('pathParameters') or {}
            query_params = event.get('queryStringParameters') or {}
        
        # CORS preflight 요청 처리
        if method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        # 경로별 라우팅
        if path == '/conversations' and method == 'GET':
            # 대화 목록 조회
            return list_conversations(query_params)
            
        elif path == '/conversations' and method == 'POST':
            # 새 대화 생성
            body = json.loads(event.get('body', '{}'))
            return create_conversation(body)
            
        elif '/conversations/' in path and method == 'GET':
            # 특정 대화 조회
            conversation_id = path.split('/conversations/')[-1].split('?')[0]
            return get_conversation(conversation_id, query_params)
            
        elif '/conversations/' in path and method == 'PUT':
            # 대화 업데이트
            conversation_id = path.split('/conversations/')[-1]
            body = json.loads(event.get('body', '{}'))
            return update_conversation(conversation_id, body)
            
        elif '/conversations/' in path and method == 'DELETE':
            # 대화 삭제
            conversation_id = path.split('/conversations/')[-1]
            return delete_conversation(conversation_id)
            
        else:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Not found'})
            }
            
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }

def list_conversations(query_params):
    """대화 목록 조회"""
    try:
        user_id = query_params.get('userId')
        # engine 또는 engineType 파라미터 모두 지원
        engine_type = query_params.get('engine') or query_params.get('engineType')
        limit = int(query_params.get('limit', 50))
        
        logger.info(f"Listing conversations for userId: {user_id}, engineType: {engine_type}")
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'userId is required'})
            }
        
        # DynamoDB 스캔 (userId 필터링)
        scan_kwargs = {
            'FilterExpression': Attr('userId').eq(user_id)
        }
        
        if engine_type:
            logger.info(f"Filtering by engineType: {engine_type}")
            scan_kwargs['FilterExpression'] = scan_kwargs['FilterExpression'] & Attr('engineType').eq(engine_type)
        
        # Limit을 제거하고 모든 항목 스캔 (필터 후 제한 적용)
        response = conversations_table.scan(**scan_kwargs)
        
        conversations = response.get('Items', [])
        
        # 페이지네이션 처리 (LastEvaluatedKey가 있으면 계속 스캔)
        while 'LastEvaluatedKey' in response and len(conversations) < limit:
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
            response = conversations_table.scan(**scan_kwargs)
            conversations.extend(response.get('Items', []))
        
        # 최신순 정렬
        conversations.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
        
        # 제한 적용
        conversations = conversations[:limit]
        
        # Decimal 변환
        conversations = [decimal_to_float(conv) for conv in conversations]
        
        # 메시지 형식 변환 (role -> type, 프론트엔드 호환성)
        for conv in conversations:
            if 'messages' in conv:
                for msg in conv['messages']:
                    if 'role' in msg and 'type' not in msg:
                        msg['type'] = 'user' if msg['role'] == 'user' else 'assistant'
        
        # 디버깅: 필터링 결과 로그
        if engine_type:
            filtered_count = sum(1 for conv in conversations if conv.get('engineType') == engine_type)
            logger.info(f"Filter check - Requested: {engine_type}, Found {filtered_count}/{len(conversations)} matching")
            # 실제로 필터링 적용 (임시 해결책)
            conversations = [conv for conv in conversations if conv.get('engineType') == engine_type]
        
        logger.info(f"Found {len(conversations)} conversations for user {user_id} (engine: {engine_type})")
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'conversations': conversations,
                'count': len(conversations)
            })
        }
        
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }

def get_conversation(conversation_id, query_params):
    """특정 대화 조회"""
    try:
        if not conversation_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'conversationId is required'})
            }
        
        response = conversations_table.get_item(
            Key={'conversationId': conversation_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Conversation not found'})
            }
        
        conversation = decimal_to_float(response['Item'])
        
        # 메시지 형식 변환 (role -> type, 프론트엔드 호환성)
        if 'messages' in conversation:
            for msg in conversation['messages']:
                if 'role' in msg and 'type' not in msg:
                    msg['type'] = 'user' if msg['role'] == 'user' else 'assistant'
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'conversation': conversation
            })
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }

def create_conversation(body):
    """새 대화 생성 또는 업데이트"""
    try:
        conversation_id = body.get('conversationId') or str(uuid.uuid4())
        user_id = body.get('userId')
        engine_type = body.get('engineType', 'T5')
        title = body.get('title', 'New Conversation')
        messages = body.get('messages', [])
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'userId is required'})
            }
        
        # 기존 대화가 있는지 확인
        existing_response = conversations_table.get_item(
            Key={'conversationId': conversation_id}
        )
        
        now = datetime.utcnow().isoformat()
        
        if 'Item' in existing_response:
            # 기존 대화가 있으면 업데이트
            logger.info(f"Updating existing conversation: {conversation_id}")
            item = existing_response['Item']
            item['messages'] = messages
            item['title'] = title
            item['engineType'] = engine_type
            item['updatedAt'] = now
            # userId는 변경하지 않음 (기존 값 유지)
        else:
            # 새 대화 생성
            logger.info(f"Creating new conversation: {conversation_id}")
            item = {
                'conversationId': conversation_id,
                'userId': user_id,
                'engineType': engine_type,
                'title': title,
                'messages': messages,
                'createdAt': now,
                'updatedAt': now,
                'metadata': body.get('metadata', {})
            }
        
        conversations_table.put_item(Item=item)
        
        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'conversationId': conversation_id,
                'conversation': item
            })
        }
        
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }

def update_conversation(conversation_id, body):
    """대화 업데이트"""
    try:
        if not conversation_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'conversationId is required'})
            }
        
        # 기존 대화 확인
        response = conversations_table.get_item(
            Key={'conversationId': conversation_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Conversation not found'})
            }
        
        # 업데이트 표현식 구성
        update_expr = "SET updatedAt = :now"
        expr_values = {':now': datetime.utcnow().isoformat()}
        
        if 'title' in body:
            update_expr += ", title = :title"
            expr_values[':title'] = body['title']
        
        if 'messages' in body:
            update_expr += ", messages = :messages"
            expr_values[':messages'] = body['messages']
        
        if 'metadata' in body:
            update_expr += ", metadata = :metadata"
            expr_values[':metadata'] = body['metadata']
        
        # 업데이트 실행
        response = conversations_table.update_item(
            Key={'conversationId': conversation_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_item = decimal_to_float(response['Attributes'])
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'conversation': updated_item
            })
        }
        
    except Exception as e:
        logger.error(f"Error updating conversation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }

def delete_conversation(conversation_id):
    """대화 삭제"""
    try:
        if not conversation_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'conversationId is required'})
            }
        
        conversations_table.delete_item(
            Key={'conversationId': conversation_id}
        )
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'message': 'Conversation deleted'
            })
        }
        
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }