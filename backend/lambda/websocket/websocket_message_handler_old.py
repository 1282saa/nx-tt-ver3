import json
import boto3
import uuid
import sys
import os
from datetime import datetime

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))

from dynamodb_client import connections_table, prompts_table, files_table

# AWS 서비스 클라이언트
apigateway_management = boto3.client('apigatewaymanagementapi', region_name='us-east-1')

def lambda_handler(event, context):
    """
    WebSocket 메시지 핸들러
    채팅 메시지를 받고 AI 응답을 스트리밍으로 전송
    """
    print(f"Message event: {json.dumps(event)}")
    
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    # API Gateway Management API 엔드포인트 설정
    apigateway_management = boto3.client(
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
        message = body.get('message', '')
        engine_type = body.get('engineType', 'T5')
        
        print(f"Action: {action}, Engine: {engine_type}, Message: {message[:100]}...")
        
        if action == 'sendMessage':
            # 채팅 메시지 처리
            response = process_chat_message(message, engine_type, connection_id, apigateway_management)
            return response
        else:
            # 알 수 없는 액션
            send_message_to_client(connection_id, {
                'type': 'error',
                'message': f'Unknown action: {action}'
            }, apigateway_management)
            
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown action'})
            }
            
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        
        # 클라이언트에게 에러 전송
        try:
            send_message_to_client(connection_id, {
                'type': 'error',
                'message': f'처리 중 오류가 발생했습니다: {str(e)}'
            }, apigateway_management)
        except:
            pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def process_chat_message(message, engine_type, connection_id, apigateway_client):
    """채팅 메시지 처리 및 AI 응답 생성"""
    
    # 1. 프롬프트와 파일 데이터 로드
    prompt_data = load_prompt_data(engine_type)
    
    # 2. 클라이언트에게 처리 시작 알림
    send_message_to_client(connection_id, {
        'type': 'chat_start',
        'message': '답변을 생성하고 있습니다...',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }, apigateway_client)
    
    # 3. 모의 AI 응답 생성 (실제로는 Bedrock이나 다른 AI 서비스 호출)
    ai_response = generate_ai_response(message, prompt_data, engine_type)
    
    # 4. 스트리밍 방식으로 응답 전송 (청크 단위)
    send_streaming_response(connection_id, ai_response, apigateway_client)
    
    # 5. 완료 알림
    send_message_to_client(connection_id, {
        'type': 'chat_end',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }, apigateway_client)
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Message processed successfully'})
    }


def load_prompt_data(engine_type):
    """프롬프트와 파일 데이터 로드"""
    try:
        # 프롬프트 로드
        prompt_response = prompts_table.get_item(Key={'id': engine_type})
        prompt = prompt_response.get('Item', {})
        
        # 파일 로드
        files_response = files_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('promptId').eq(engine_type)
        )
        files = files_response.get('Items', [])
        
        return {
            'prompt': prompt,
            'files': files
        }
        
    except Exception as e:
        print(f"Error loading prompt data: {str(e)}")
        return {'prompt': {}, 'files': []}


def generate_ai_response(user_message, prompt_data, engine_type):
    """AI 응답 생성 (현재는 모의 응답, 추후 Bedrock 연결 예정)"""
    
    # 프롬프트와 컨텍스트 구성
    instruction = prompt_data.get('prompt', {}).get('instruction', '')
    context_files = "\n".join([
        f"파일명: {f.get('fileName', '')}\n내용: {f.get('fileContent', '')}" 
        for f in prompt_data.get('files', [])
    ])
    
    # 모의 AI 응답 (실제로는 Bedrock Claude 호출)
    if engine_type == 'T5':
        response = f"""**T5 엔진 응답**: {user_message}에 대한 뉴스 제목을 생성합니다.

사용된 지침: {instruction[:100]}...
참고 파일: {len(prompt_data.get('files', []))}개

생성된 제목:
1. "{user_message}"의 핵심 키워드를 활용한 임팩트 있는 제목
2. 독자의 관심을 끌 수 있는 매력적인 표현
3. SEO 최적화를 고려한 검색 친화적 제목

이는 T5 엔진의 신속성과 정확성을 바탕으로 한 결과입니다."""

    else:  # H8
        response = f"""**H8 엔진 응답**: {user_message}를 분석하여 심층적인 뉴스 제목을 제안합니다.

적용된 컨텍스트: {instruction[:100]}...
활용 리소스: {len(prompt_data.get('files', []))}개 파일

심층 분석 결과:
• 감정 분석을 통한 독자 반응 예측
• 트렌드 키워드를 활용한 최적화
• 다양한 연령층을 고려한 표현 방식

제안 제목:
- 주요 키워드 중심의 직관적 제목
- 호기심 유발을 위한 질문형 제목  
- 감정적 어필이 강한 임팩트 제목

H8 엔진의 창의성과 깊이 있는 분석력이 반영된 결과입니다."""

    return response


def send_streaming_response(connection_id, response_text, apigateway_client):
    """응답을 청크 단위로 스트리밍 전송"""
    
    # 응답을 청크로 나누기 (실제 스트리밍 효과)
    chunk_size = 50  # 50자씩 전송
    chunks = [response_text[i:i+chunk_size] for i in range(0, len(response_text), chunk_size)]
    
    for i, chunk in enumerate(chunks):
        send_message_to_client(connection_id, {
            'type': 'chat_chunk',
            'chunk': chunk,
            'chunk_index': i,
            'total_chunks': len(chunks),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }, apigateway_client)
        
        # 실제 스트리밍 효과를 위한 약간의 지연 (선택사항)
        import time
        time.sleep(0.1)  # 100ms 지연


def send_message_to_client(connection_id, message, apigateway_client):
    """클라이언트에게 메시지 전송"""
    try:
        apigateway_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, ensure_ascii=False)
        )
        print(f"Message sent to {connection_id}: {message.get('type', 'unknown')}")
        
    except apigateway_client.exceptions.GoneException:
        print(f"Connection {connection_id} is gone, cleaning up...")
        # 연결이 끊어진 경우 DB에서도 제거
        try:
            connections_table.delete_item(Key={'connectionId': connection_id})
        except:
            pass
            
    except Exception as e:
        print(f"Error sending message to {connection_id}: {str(e)}")
        raise