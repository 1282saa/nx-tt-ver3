import json
import boto3
from datetime import datetime
import uuid

# DynamoDB 설정
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
conversations_table = dynamodb.Table('nx-tt-dev-ver3-conversations')

# CORS 헤더 설정
def get_cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }

def lambda_handler(event, context):
    """
    대화 데이터 저장/조회 Lambda 핸들러
    """
    print(f"Event: {json.dumps(event)}")
    
    # OPTIONS 요청 처리 (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({'message': 'CORS preflight OK'})
        }
    
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', 'GET')
        
        # POST /conversations - 새 대화 저장 또는 업데이트
        if method == 'POST' and path == '/conversations':
            body = json.loads(event.get('body', '{}'))
            
            # 필수 필드 검증
            if not body.get('messages'):
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({'error': 'messages field is required'})
                }
            
            # 대화 ID 생성 또는 사용
            conversation_id = body.get('conversationId') or str(uuid.uuid4())
            
            # DynamoDB에 저장
            item = {
                'conversationId': conversation_id,
                'messages': body['messages'],
                'engineType': body.get('engineType', 'T5'),
                'title': body.get('title', 'New Conversation'),
                'createdAt': body.get('createdAt', datetime.now().isoformat()),
                'updatedAt': datetime.now().isoformat(),
                'metadata': body.get('metadata', {})
            }
            
            conversations_table.put_item(Item=item)
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'conversationId': conversation_id,
                    'message': 'Conversation saved successfully'
                })
            }
        
        # GET /conversations/{id} - 특정 대화 조회
        elif method == 'GET' and '/conversations/' in path:
            conversation_id = path.split('/')[-1]
            
            response = conversations_table.get_item(
                Key={'conversationId': conversation_id}
            )
            
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': get_cors_headers(),
                    'body': json.dumps({'error': 'Conversation not found'})
                }
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(response['Item'])
            }
        
        # GET /conversations - 모든 대화 목록 조회
        elif method == 'GET' and path == '/conversations':
            response = conversations_table.scan(
                ProjectionExpression='conversationId, title, engineType, createdAt, updatedAt'
            )
            
            conversations = response.get('Items', [])
            
            # 최신순 정렬
            conversations.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'conversations': conversations,
                    'count': len(conversations)
                })
            }
        
        # DELETE /conversations/{id} - 대화 삭제
        elif method == 'DELETE' and '/conversations/' in path:
            conversation_id = path.split('/')[-1]
            
            conversations_table.delete_item(
                Key={'conversationId': conversation_id}
            )
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Conversation deleted successfully'
                })
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Not Found'})
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }