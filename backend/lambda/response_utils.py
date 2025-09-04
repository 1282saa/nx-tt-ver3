"""
공통 응답 유틸리티 함수
"""
import json

def create_response(status_code, body, headers=None):
    """표준 HTTP 응답 생성"""
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
    }
    
    if headers:
        default_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body, default=str, ensure_ascii=False)
    }

def create_success_response(body, status_code=200):
    """성공 응답 생성"""
    return create_response(status_code, body)

def create_error_response(error_message, status_code=500):
    """에러 응답 생성"""
    return create_response(status_code, {'error': error_message})