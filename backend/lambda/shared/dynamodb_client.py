"""
공통 DynamoDB 클라이언트 및 테이블 설정
"""
import boto3
from boto3.dynamodb.conditions import Key

# DynamoDB 리소스 초기화
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# 테이블 정의
TABLES = {
    'prompts': 'nx-tt-dev-ver3-prompts',
    'files': 'nx-tt-dev-ver3-files',
    'websocket_connections': 'nx-tt-dev-ver3-websocket-connections'
}

# 테이블 인스턴스
prompts_table = dynamodb.Table(TABLES['prompts'])
files_table = dynamodb.Table(TABLES['files'])
connections_table = dynamodb.Table(TABLES['websocket_connections'])

def get_table(table_name):
    """테이블 인스턴스 반환"""
    if table_name in TABLES:
        return dynamodb.Table(TABLES[table_name])
    else:
        raise ValueError(f"Unknown table: {table_name}")