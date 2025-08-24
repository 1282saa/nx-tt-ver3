import json
import boto3
import uuid
import sys
import os
import logging
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# shared 폴더를 sys.path에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

# 대화 관리자 import
try:
    from conversation_manager import ConversationManager
    logger.info("ConversationManager imported successfully")
except ImportError:
    logger.warning("Could not import ConversationManager")
    ConversationManager = None

# bedrock_client_enhanced import
try:
    from bedrock_client_enhanced import (
        create_enhanced_system_prompt,
        stream_claude_response_enhanced,
        create_user_message_with_anchoring
    )
    logger.info("Successfully imported bedrock_client_enhanced")
except ImportError:
    logger.warning("Could not import bedrock_client_enhanced, falling back to basic implementation")
    # Fallback functions if enhanced version is not available
    from bedrock_client import create_system_prompt as create_enhanced_system_prompt
    from bedrock_client import stream_claude_response as stream_claude_response_enhanced
    create_user_message_with_anchoring = lambda msg, fmt=None, ex=None: msg

# Direct DynamoDB setup
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
connections_table = dynamodb.Table('nx-tt-dev-ver3-websocket-connections')
prompts_table = dynamodb.Table('nx-tt-dev-ver3-prompts')
files_table = dynamodb.Table('nx-tt-dev-ver3-files')

# AWS 서비스 클라이언트
apigateway_management = boto3.client('apigatewaymanagementapi', region_name='us-east-1')

def lambda_handler(event, context):
    """
    WebSocket 메시지 핸들러 - 실제 Bedrock Claude 연동
    """
    logger.info(f"Message event: {json.dumps(event)}")
    
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    # API Gateway Management API 엔드포인트 설정
    apigateway_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=f'https://{domain_name}/{stage}',
        region_name='us-east-1'
    )
    
    try:
        # 요청 메시지 파싱
        if event.get('body'):
            body = json.loads(event['body'])
        else:
            raise ValueError("No message body provided")
        
        action = body.get('action', 'sendMessage')
        user_message = body.get('message', '')
        engine_type = body.get('engineType', 'T5')
        conversation_history = body.get('conversationHistory', [])
        conversation_id = body.get('conversationId', None)
        
        logger.info(f"Action: {action}, Engine: {engine_type}, Message: {user_message[:100]}...")
        logger.info(f"Conversation ID: {conversation_id}, History Length: {len(conversation_history)}")
        
        if action == 'sendMessage':
            # 대화 ID가 없으면 생성
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                logger.info(f"Generated new conversation ID: {conversation_id}")
            
            # DynamoDB에서 대화 히스토리 로드 (클라이언트 히스토리보다 우선)
            if ConversationManager:
                db_history = ConversationManager.get_conversation_history(conversation_id)
                if db_history:
                    logger.info(f"Loaded {len(db_history)} messages from DynamoDB")
                    # DB 히스토리를 사용 (더 신뢰할 수 있음)
                    conversation_history = db_history
            
            # 채팅 메시지 처리 (대화 히스토리 포함)
            response = process_chat_message_with_bedrock(
                user_message, engine_type, connection_id, apigateway_client, 
                conversation_history, conversation_id
            )
            return response
        else:
            # 알 수 없는 액션
            send_message_to_client(connection_id, {
                'type': 'error',
                'message': f'Unknown action: {action}'
            }, apigateway_client)
            
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown action'})
            }
            
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}", exc_info=True)
        
        # 클라이언트에게 에러 전송
        try:
            send_message_to_client(connection_id, {
                'type': 'error',
                'message': f'처리 중 오류가 발생했습니다: {str(e)}'
            }, apigateway_client)
        except:
            pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def process_chat_message_with_bedrock(user_message, engine_type, connection_id, apigateway_client, conversation_history=None, conversation_id=None):
    """실제 Bedrock Claude를 사용한 채팅 메시지 처리 (대화 히스토리 포함)"""
    
    try:
        # 0. 사용자 메시지를 DynamoDB에 저장
        if ConversationManager and conversation_id:
            ConversationManager.save_message(conversation_id, 'user', user_message, engine_type)
        
        # 1. 처리 시작 알림 (제거 - UI에 표시하지 않음)
        # send_message_to_client(connection_id, {
        #     'type': 'chat_start',
        #     'engine': engine_type,
        #     'message': f'{engine_type} 엔진으로 제목을 생성하고 있습니다...',
        #     'timestamp': datetime.utcnow().isoformat() + 'Z'
        # }, apigateway_client)
        
        # 2. 프롬프트와 파일 데이터 로드
        logger.info(f"Loading prompt data for {engine_type}")
        prompt_data = load_prompt_data(engine_type)
        
        if not prompt_data.get('prompt'):
            raise ValueError(f"{engine_type} 엔진의 프롬프트 데이터를 찾을 수 없습니다")
        
        # 3. 시스템 프롬프트 구성
        system_prompt = create_system_prompt_inline(prompt_data, engine_type)
        logger.info(f"System prompt created: {len(system_prompt)} characters")
        
        # 4. 데이터베이스 조회 확인 메시지 (제거 - UI에 표시하지 않음)
        file_count = len(prompt_data.get('files', []))
        # send_message_to_client(connection_id, {
        #     'type': 'data_loaded',
        #     'engine': engine_type,
        #     'prompt_length': len(system_prompt),
        #     'file_count': file_count,
        #     'message': f'{engine_type} 엔진 데이터 로드 완료 (파일 {file_count}개)',
        #     'timestamp': datetime.utcnow().isoformat() + 'Z'
        # }, apigateway_client)
        
        # 5. Bedrock Claude 스트리밍 호출
        logger.info("Starting Bedrock Claude streaming")
        # AI 시작 신호만 보내고 메시지는 표시하지 않음
        send_message_to_client(connection_id, {
            'type': 'ai_start',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }, apigateway_client)
        
        # 6. 실시간 스트리밍 응답 전송
        chunk_index = 0
        total_response = ""
        
        for chunk_text in stream_claude_response_inline(user_message, system_prompt, conversation_history):
            if chunk_text:
                total_response += chunk_text
                
                # 실시간으로 청크 전송
                send_message_to_client(connection_id, {
                    'type': 'ai_chunk',
                    'chunk': chunk_text,
                    'chunk_index': chunk_index,
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }, apigateway_client)
                
                chunk_index += 1
        
        # 7. AI 응답을 DynamoDB에 저장
        if ConversationManager and conversation_id and total_response:
            ConversationManager.save_message(conversation_id, 'assistant', total_response, engine_type)
        
        # 8. 완료 알림 (conversation_id 포함)
        send_message_to_client(connection_id, {
            'type': 'chat_end',
            'engine': engine_type,
            'conversationId': conversation_id,  # 클라이언트에 대화 ID 전달
            'total_chunks': chunk_index,
            'response_length': len(total_response),
            'message': '응답 생성이 완료되었습니다.',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }, apigateway_client)
        
        logger.info(f"Chat processing completed: {chunk_index} chunks, {len(total_response)} characters")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Message processed successfully',
                'chunks_sent': chunk_index,
                'response_length': len(total_response)
            })
        }
        
    except Exception as e:
        logger.error(f"Error in chat processing: {str(e)}", exc_info=True)
        
        # 에러 알림
        send_message_to_client(connection_id, {
            'type': 'chat_error',
            'engine': engine_type,
            'error': str(e),
            'message': f'{engine_type} 엔진 처리 중 오류가 발생했습니다: {str(e)}',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }, apigateway_client)
        
        raise


def load_prompt_data(engine_type):
    """프롬프트와 파일 데이터 로드"""
    try:
        logger.info(f"Loading data for engine: {engine_type}")
        
        # 프롬프트 로드
        prompt_response = prompts_table.get_item(Key={'id': engine_type})
        prompt = prompt_response.get('Item', {})
        
        if not prompt:
            logger.warning(f"No prompt found for engine: {engine_type}")
        
        # 파일 로드 (DynamoDB 조건 키 사용)
        from boto3.dynamodb.conditions import Key
        files_response = files_table.query(
            KeyConditionExpression=Key('promptId').eq(engine_type)
        )
        files = files_response.get('Items', [])
        
        logger.info(f"Loaded: prompt={bool(prompt)}, files={len(files)}")
        
        return {
            'prompt': prompt,
            'files': files
        }
        
    except Exception as e:
        logger.error(f"Error loading prompt data for {engine_type}: {str(e)}")
        raise


def create_system_prompt_inline(prompt_data, engine_type):
    """향상된 시스템 프롬프트 구성 (bedrock_client_enhanced 사용)"""
    # enhanced 버전 사용
    return create_enhanced_system_prompt(prompt_data, engine_type, use_enhanced=True)


def stream_claude_response_inline(user_message, system_prompt, conversation_history=None):
    """Claude Native 대화 형식으로 스트리밍 응답 생성"""
    try:
        # Claude API가 이해하는 형식으로 대화 히스토리 구성
        messages = []
        
        if conversation_history and len(conversation_history) > 0:
            logger.info(f"Processing {len(conversation_history)} history messages")
            
            # 대화 히스토리를 Claude 형식으로 변환 (최근 10개까지만)
            recent_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
            
            for msg in recent_history:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                # role 변환: type -> role
                if msg.get('type'):
                    role = 'user' if msg['type'] == 'user' else 'assistant'
                
                # Claude API는 user/assistant만 인식
                if role in ['user', 'assistant'] and content:
                    messages.append({
                        "role": role,
                        "content": content
                    })
            
            logger.info(f"Converted {len(messages)} messages for Claude")
        
        # 현재 메시지 추가
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Claude Native API 호출
        import boto3
        import json
        
        bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 8192,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": messages
        }
        
        logger.info(f"Calling Claude with {len(messages)} messages")
        
        response = bedrock_runtime.invoke_model_with_response_stream(
            modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
            body=json.dumps(body)
        )
        
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    
                    if chunk_obj.get('type') == 'content_block_delta':
                        delta = chunk_obj.get('delta', {})
                        if delta.get('type') == 'text_delta':
                            text = delta.get('text', '')
                            if text:
                                yield text
                    
                    elif chunk_obj.get('type') == 'message_stop':
                        logger.info("Claude streaming completed")
                        break
                        
    except Exception as e:
        logger.error(f"Error calling Claude: {str(e)}")
        yield f"\n\n⚠️ AI 응답 생성 중 오류가 발생했습니다: {str(e)}"


def send_message_to_client(connection_id, message, apigateway_client):
    """클라이언트에게 메시지 전송"""
    try:
        apigateway_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, ensure_ascii=False, default=str)
        )
        logger.debug(f"Message sent to {connection_id}: {message.get('type', 'unknown')}")
        
    except apigateway_client.exceptions.GoneException:
        logger.warning(f"Connection {connection_id} is gone, cleaning up...")
        # 연결이 끊어진 경우 DB에서도 제거
        try:
            connections_table.delete_item(Key={'connectionId': connection_id})
        except:
            pass
            
    except Exception as e:
        logger.error(f"Error sending message to {connection_id}: {str(e)}")
        raise