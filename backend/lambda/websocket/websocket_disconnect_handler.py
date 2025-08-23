import json
import boto3
from datetime import datetime

# Direct DynamoDB setup
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
connections_table = dynamodb.Table('nx-tt-dev-ver3-websocket-connections')

def lambda_handler(event, context):
    """
    WebSocket 연결 해제 핸들러
    클라이언트가 WebSocket 연결을 끊을 때 호출됨
    """
    print(f"Disconnect event: {json.dumps(event)}")
    
    connection_id = event['requestContext']['connectionId']
    
    try:
        # 연결 정보를 DynamoDB에서 삭제 또는 상태 업데이트
        connections_table.update_item(
            Key={'connectionId': connection_id},
            UpdateExpression='SET #status = :status, disconnectedAt = :disconnected',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'disconnected',
                ':disconnected': datetime.utcnow().isoformat() + 'Z'
            }
        )
        
        print(f"Connection {connection_id} marked as disconnected")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected successfully'})
        }
        
    except Exception as e:
        print(f"Error updating connection {connection_id}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }