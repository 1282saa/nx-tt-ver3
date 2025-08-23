import json
import boto3
from datetime import datetime

# Direct DynamoDB setup (Lambda에서는 shared 모듈 import 문제로 직접 설정)
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
connections_table = dynamodb.Table('nx-tt-dev-ver3-websocket-connections')

def lambda_handler(event, context):
    """
    WebSocket 연결 핸들러
    클라이언트가 WebSocket에 연결될 때 호출됨
    """
    print(f"Connect event: {json.dumps(event)}")
    
    connection_id = event['requestContext']['connectionId']
    
    try:
        # 연결 정보를 DynamoDB에 저장
        connections_table.put_item(Item={
            'connectionId': connection_id,
            'connectedAt': datetime.utcnow().isoformat() + 'Z',
            'status': 'connected'
        })
        
        print(f"Connection {connection_id} stored successfully")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Connected successfully'})
        }
        
    except Exception as e:
        print(f"Error storing connection {connection_id}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }