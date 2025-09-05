"""
Conversation API Handler
대화 관리 REST API 엔드포인트
"""
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

from services.conversation_service import ConversationService
from utils.response import APIResponse
from utils.logger import setup_logger

# 로깅 설정
logger = setup_logger(__name__)




def handler(event, context):
    """
    Lambda 핸들러 - 대화 관리 API
    """
    logger.info(f"Event: {json.dumps(event)}")
    
    # API Gateway v2 형식 처리
    if 'version' in event and event['version'] == '2.0':
        # API Gateway v2 (HTTP API)
        http_method = event.get('requestContext', {}).get('http', {}).get('method')
        path_params = event.get('pathParameters', {})
    else:
        # API Gateway v1 (REST API) 또는 직접 호출
        http_method = event.get('httpMethod')
        path_params = event.get('pathParameters', {})
    
    # OPTIONS 요청 처리 (CORS)
    if http_method == 'OPTIONS':
        return APIResponse.cors_preflight()
    
    try:
        
        # Service 초기화
        conversation_service = ConversationService()
        
        # GET /conversations - 목록 조회
        if http_method == 'GET' and not path_params:
            # 쿼리 파라미터에서 userId와 engineType 추출
            query_params = event.get('queryStringParameters', {}) or {}
            user_id = query_params.get('userId')
            engine_type = query_params.get('engineType') or query_params.get('engine')
            
            conversations = conversation_service.list_conversations(user_id, engine_type)
            
            return APIResponse.success({
                'conversations': conversations,
                'count': len(conversations)
            })
        
        # GET /conversations/{conversationId} - 상세 조회
        elif http_method == 'GET' and 'conversationId' in path_params:
            conversation = conversation_service.get_conversation(
                path_params['conversationId']
            )
            if conversation:
                return APIResponse.success(conversation)
            else:
                return APIResponse.error('Conversation not found', 404)
        
        # POST /conversations - 대화 저장
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            saved = conversation_service.create_or_update_conversation(body)
            return APIResponse.success(saved, 201)
        
        # PATCH /conversations/{conversationId} - 대화 부분 업데이트 (제목 수정 등)
        elif http_method == 'PATCH' and 'conversationId' in path_params:
            body = json.loads(event.get('body', '{}'))
            conversation_id = path_params['conversationId']
            
            if 'title' in body:
                success = conversation_service.update_title(conversation_id, body['title'])
                if success:
                    return APIResponse.success({'message': 'Conversation updated'})
                else:
                    return APIResponse.error('Failed to update conversation', 500)
            else:
                return APIResponse.error('No title field to update', 400)
        
        # DELETE /conversations/{conversationId} - 대화 삭제
        elif http_method == 'DELETE' and 'conversationId' in path_params:
            success = conversation_service.delete_conversation(
                path_params['conversationId']
            )
            if success:
                return APIResponse.success({'message': 'Conversation deleted'})
            else:
                return APIResponse.error('Failed to delete conversation', 500)
        
        else:
            return APIResponse.error('Method not allowed', 405)
            
    except Exception as e:
        logger.error(f"Error in conversation handler: {e}", exc_info=True)
        return APIResponse.error(str(e), 500)