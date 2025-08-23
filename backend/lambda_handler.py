import json
import boto3
import os
from typing import Dict, Any

# Bedrock 클라이언트 초기화
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.environ.get('AWS_REGION', 'us-east-1')
)

def generate_titles(article_content: str) -> Dict[str, Any]:
    """
    기사 내용을 받아 제목을 생성하는 함수
    
    Args:
        article_content: 기사 본문
    
    Returns:
        생성된 제목들과 메타데이터
    """
    
    prompt = f"""다음 뉴스 기사를 읽고 다양한 스타일의 제목을 10개 생성해주세요.
    각 제목은 한 줄로 작성하고, 기사의 핵심 내용을 잘 담아야 합니다.
    
    [기사 내용]
    {article_content}
    
    [제목 생성]
    1.
    2.
    3.
    4.
    5.
    6.
    7.
    8.
    9.
    10."""
    
    # Bedrock Claude Sonnet 4 호출
    try:
        # Inference Profile ID 사용 (Claude Sonnet 4)
        model_id = 'us.anthropic.claude-sonnet-4-20250514-v1:0'
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,  # 최대값 설정
            "temperature": 0.2,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        generated_text = response_body.get('content', [{}])[0].get('text', '')
        
        # 생성된 텍스트를 줄 단위로 분리하고 번호 제거
        titles = []
        for line in generated_text.split('\n'):
            line = line.strip()
            if line and line[0].isdigit():
                # 번호와 점 제거 (예: "1. " -> "")
                title = line.split('.', 1)[1].strip() if '.' in line else line[2:].strip()
                if title:
                    titles.append(title)
        
        result = {
            "titles": titles,
            "count": len(titles),
            "model": model_id,
            "raw_response": generated_text
        }
        
        return result
        
    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")
        raise e


def lambda_handler(event, context):
    """
    Lambda 핸들러 함수
    """
    print(f"Received event: {json.dumps(event)}")
    
    # CORS 헤더
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    }
    
    # OPTIONS 요청 처리 (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # 요청 본문 파싱
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # 필수 파라미터 확인
        article_content = body.get('article_content')
        if not article_content:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'article_content is required',
                    'message': '기사 내용을 입력해주세요.'
                })
            }
        
        # 제목 생성
        result = generate_titles(article_content)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'data': result
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }