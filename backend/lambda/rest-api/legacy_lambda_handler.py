import json
import boto3
import os
from typing import Dict, Any, List
import re

# Bedrock 클라이언트 초기화 - 명시적으로 us-east-1 사용
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1'  # 명시적으로 us-east-1 지정
)

def generate_titles(article_content: str) -> Dict[str, Any]:
    """
    기사 내용을 받아 제목을 생성하는 함수
    
    Args:
        article_content: 기사 본문
    
    Returns:
        생성된 제목들과 메타데이터
    """
    
    # 더 명확한 프롬프트로 개선
    prompt = f"""다음 뉴스 기사를 읽고 다양한 스타일의 제목을 정확히 10개 생성해주세요.
각 제목은 반드시 숫자와 점으로 시작하고(예: 1. ), 한 줄로 작성해주세요.
기사의 핵심 내용을 잘 담아야 합니다.

[기사 내용]
{article_content}

[제목 생성]
1. 첫 번째 제목을 여기에 작성
2. 두 번째 제목을 여기에 작성
3. 세 번째 제목을 여기에 작성
4. 네 번째 제목을 여기에 작성
5. 다섯 번째 제목을 여기에 작성
6. 여섯 번째 제목을 여기에 작성
7. 일곱 번째 제목을 여기에 작성
8. 여덟 번째 제목을 여기에 작성
9. 아홉 번째 제목을 여기에 작성
10. 열 번째 제목을 여기에 작성"""
    
    # Bedrock Claude Sonnet 4 호출
    try:
        # Inference Profile ID 사용 (Claude Sonnet 4)
        model_id = 'us.anthropic.claude-sonnet-4-20250514-v1:0'
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "temperature": 0.7,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        print(f"Calling Bedrock with model: {model_id}")
        print(f"Region: us-east-1")
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        generated_text = response_body.get('content', [{}])[0].get('text', '')
        
        print(f"Generated text: {generated_text[:500]}...")  # 디버깅용
        
        # 개선된 파싱 로직
        titles = []
        lines = generated_text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 숫자로 시작하는 라인 찾기 (1. 또는 1) 형식)
            match = re.match(r'^(\d+)[\.\)]\s*(.+)', line)
            if match:
                title = match.group(2).strip()
                if title:
                    titles.append(title)
            # 번호 없이 제목만 있는 경우도 처리
            elif len(titles) < 10 and line and not line.startswith('['):
                # [제목 생성] 같은 헤더는 제외
                titles.append(line)
        
        # 제목이 없으면 전체 텍스트에서 다시 파싱 시도
        if not titles:
            print("No titles found with first parsing, trying alternative...")
            # 대체 파싱: 줄바꿈으로 구분된 텍스트 추출
            for line in lines:
                line = line.strip()
                if line and not line.startswith('[') and len(line) > 10:
                    titles.append(line)
                    if len(titles) >= 10:
                        break
        
        result = {
            "titles": titles[:10],  # 최대 10개만
            "count": len(titles[:10]),
            "model": model_id,
            "raw_response": generated_text[:1000]  # 디버깅용 일부만
        }
        
        print(f"Parsed {len(titles)} titles")
        return result
        
    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")
        print(f"Error type: {type(e).__name__}")
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