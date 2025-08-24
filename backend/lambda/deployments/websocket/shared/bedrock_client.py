"""
AWS Bedrock Claude 클라이언트
"""
import boto3
import json
import logging
from typing import Dict, Any, Iterator

logger = logging.getLogger(__name__)

# Bedrock Runtime 클라이언트 초기화
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Claude 4.0 모델 설정
CLAUDE_MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MAX_TOKENS = 8192  # 최대 토큰으로 증가
TEMPERATURE = 0.2  # 더 일관된 출력을 위해 낮춤

def create_system_prompt(prompt_data: Dict[str, Any], engine_type: str) -> str:
    """
    관리자가 설정한 프롬프트 데이터로부터 시스템 프롬프트 구성
    
    Args:
        prompt_data: DB에서 조회한 프롬프트와 파일 데이터
        engine_type: T5 또는 H8 엔진 타입
        
    Returns:
        완성된 시스템 프롬프트
    """
    prompt = prompt_data.get('prompt', {})
    files = prompt_data.get('files', [])
    
    # 기본 정보
    description = prompt.get('description', f'{engine_type} 엔진')
    instruction = prompt.get('instruction', '제목을 생성해주세요.')
    
    # 파일 내용들 구성
    file_contexts = []
    if files:
        file_contexts.append("\n=== 참고 자료 ===")
        for file in files:
            file_name = file.get('fileName', 'unknown')
            file_content = file.get('fileContent', '')
            if file_content.strip():
                file_contexts.append(f"\n[{file_name}]")
                file_contexts.append(file_content.strip())
    
    # 시스템 프롬프트 구성
    system_prompt = f"""당신은 {description}

{instruction}

{''.join(file_contexts)}

=== 응답 규칙 ===
1. 주어진 지침을 정확히 준수해주세요

    logger.info(f"System prompt created for {engine_type}: {len(system_prompt)} characters")
    return system_prompt

def stream_claude_response(user_message: str, system_prompt: str) -> Iterator[str]:
    """
    Claude 모델을 스트리밍 호출하여 응답 생성
    
    Args:
        user_message: 사용자 질의
        system_prompt: 시스템 프롬프트
        
    Yields:
        스트리밍 응답 청크들
    """
    try:
        # Claude 요청 메시지 구성
        messages = [
            {
                "role": "user",
                "content": user_message
            }
        ]
        
        # Bedrock 호출 파라미터
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
            "system": system_prompt,
            "messages": messages,
            "stream": True
        }
        
        logger.info(f"Calling Bedrock with model: {CLAUDE_MODEL_ID}")
        logger.debug(f"System prompt length: {len(system_prompt)}")
        logger.debug(f"User message: {user_message[:100]}...")
        
        # Bedrock Runtime 스트리밍 호출
        response = bedrock_runtime.invoke_model_with_response_stream(
            modelId=CLAUDE_MODEL_ID,
            body=json.dumps(body)
        )
        
        # 스트리밍 응답 처리
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    
                    if chunk_obj.get('type') == 'content_block_delta':
                        # 텍스트 델타 추출
                        delta = chunk_obj.get('delta', {})
                        if delta.get('type') == 'text_delta':
                            text = delta.get('text', '')
                            if text:
                                yield text
                    
                    elif chunk_obj.get('type') == 'message_stop':
                        # 스트리밍 종료
                        logger.info("Claude streaming completed")
                        break
        
    except Exception as e:
        logger.error(f"Error calling Claude: {str(e)}")
        yield f"\n\nAI 응답 생성 중 오류가 발생했습니다: {str(e)}"

def get_claude_response_sync(user_message: str, system_prompt: str) -> str:
    """
    Claude 모델을 동기 호출하여 전체 응답 반환 (테스트용)
    
    Args:
        user_message: 사용자 질의
        system_prompt: 시스템 프롬프트
        
    Returns:
        완성된 AI 응답
    """
    try:
        # 스트리밍 응답을 모두 모아서 반환
        response_parts = []
        for chunk in stream_claude_response(user_message, system_prompt):
            response_parts.append(chunk)
        
        return ''.join(response_parts)
        
    except Exception as e:
        logger.error(f"Error in sync Claude call: {str(e)}")
        return f"AI 응답 생성 중 오류가 발생했습니다: {str(e)}"