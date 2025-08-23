import json
import uuid
import sys
import os
from datetime import datetime
from typing import Dict, Any, List

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))

from dynamodb_client import prompts_table, files_table
from response_utils import create_success_response, create_error_response

def lambda_handler(event, context):
    """
    프롬프트 CRUD 처리를 위한 Lambda 핸들러
    """
    print(f"Received event: {json.dumps(event)}")
    
    # CORS 헤더는 response_utils에서 자동 처리
    
    # API Gateway v2 형식과 v1 형식에서 HTTP 메소드 확인
    if 'requestContext' in event and 'http' in event.get('requestContext', {}):
        # API Gateway v2 형식
        http_method = event['requestContext']['http']['method']
        path = event['requestContext']['http']['path']
    else:
        # API Gateway v1 형식 또는 직접 호출
        http_method = event.get('httpMethod')
        path = event.get('path', '')
    
    # OPTIONS 요청 처리 (CORS preflight)
    if http_method == 'OPTIONS':
        return create_success_response({'message': 'OK'})
    
    try:
        path_params = event.get('pathParameters', {})
        
        print(f"Method: {http_method}, Path: {path}, PathParams: {path_params}")
        
        # 요청 본문 파싱
        body = {}
        if event.get('body'):
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            print(f"Body: {body}")
        
        # 라우팅
        if '/prompts' in path:
            if '/files' in path:
                # 파일 관련 작업
                return handle_files(http_method, path_params, body)
            else:
                # 프롬프트 관련 작업
                return handle_prompts(http_method, path_params, body)
        
        return create_error_response('Not Found', 404)
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return create_error_response(str(e))


def handle_prompts(method: str, path_params: Dict, body: Dict) -> Dict:
    """프롬프트 (설명, 지침) CRUD 처리"""
    
    engine_type = path_params.get('engineType')  # T5 또는 H8
    
    if method == 'GET':
        # 특정 엔진의 프롬프트 조회
        if engine_type:
            response = prompts_table.get_item(Key={'id': engine_type})
            item = response.get('Item', {})
            
            # 해당 엔진의 파일들도 함께 조회
            files_response = files_table.query(
                KeyConditionExpression=Key('promptId').eq(engine_type)
            )
            files = files_response.get('Items', [])
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'prompt': item,
                    'files': files
                }, default=str)
            }
        else:
            # 모든 프롬프트 조회
            response = prompts_table.scan()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'prompts': response.get('Items', [])}, default=str)
            }
    
    elif method == 'PUT':
        # 프롬프트 업데이트 (설명, 지침만)
        if not engine_type:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'engineType is required'})
            }
        
        update_expr = []
        expr_attr_values = {}
        
        if 'description' in body:
            update_expr.append('description = :desc')
            expr_attr_values[':desc'] = body['description']
        
        if 'instruction' in body:
            update_expr.append('instruction = :inst')
            expr_attr_values[':inst'] = body['instruction']
        
        if update_expr:
            update_expr.append('updatedAt = :updated')
            expr_attr_values[':updated'] = datetime.utcnow().isoformat() + 'Z'
            
            prompts_table.update_item(
                Key={'id': engine_type},
                UpdateExpression='SET ' + ', '.join(update_expr),
                ExpressionAttributeValues=expr_attr_values
            )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Prompt updated successfully'})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }


def handle_files(method: str, path_params: Dict, body: Dict, headers: Dict) -> Dict:
    """파일 CRUD 처리"""
    
    engine_type = path_params.get('engineType')  # T5 또는 H8
    file_id = path_params.get('fileId')
    
    if method == 'GET':
        # 특정 엔진의 파일 목록 조회
        if engine_type:
            response = files_table.query(
                KeyConditionExpression=Key('promptId').eq(engine_type)
            )
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'files': response.get('Items', [])}, default=str)
            }
    
    elif method == 'POST':
        # 새 파일 추가
        if not engine_type:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'engineType is required'})
            }
        
        new_file_id = str(uuid.uuid4())
        item = {
            'promptId': engine_type,
            'fileId': new_file_id,
            'fileName': body.get('fileName', 'untitled.txt'),
            'fileContent': body.get('fileContent', ''),
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        files_table.put_item(Item=item)
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({'file': item}, default=str)
        }
    
    elif method == 'PUT':
        # 파일 수정
        if not engine_type or not file_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'engineType and fileId are required'})
            }
        
        update_expr = []
        expr_attr_values = {}
        
        if 'fileName' in body:
            update_expr.append('fileName = :name')
            expr_attr_values[':name'] = body['fileName']
        
        if 'fileContent' in body:
            update_expr.append('fileContent = :content')
            expr_attr_values[':content'] = body['fileContent']
        
        if update_expr:
            update_expr.append('updatedAt = :updated')
            expr_attr_values[':updated'] = datetime.utcnow().isoformat() + 'Z'
            
            files_table.update_item(
                Key={'promptId': engine_type, 'fileId': file_id},
                UpdateExpression='SET ' + ', '.join(update_expr),
                ExpressionAttributeValues=expr_attr_values
            )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'File updated successfully'})
        }
    
    elif method == 'DELETE':
        # 파일 삭제
        if not engine_type or not file_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'engineType and fileId are required'})
            }
        
        files_table.delete_item(
            Key={'promptId': engine_type, 'fileId': file_id}
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'File deleted successfully'})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }