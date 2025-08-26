"""
AWS Bedrock Claude 클라이언트 - 향상된 프롬프트 엔지니어링 버전
각 컴포넌트의 역할을 명확히 구분하고 지침 준수를 강화한 버전
"""
import boto3
import json
import logging
from typing import Dict, Any, Iterator, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Bedrock Runtime 클라이언트 초기화
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Claude 4.0 모델 설정
CLAUDE_MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MAX_TOKENS = 8192
TEMPERATURE = 0.2  # 일관성 있는 출력을 위해 낮은 온도 유지

class PromptComponent:
    """프롬프트 컴포넌트의 역할을 명확히 정의"""
    
    DESCRIPTION = "ROLE_DEFINITION"      # AI의 역할/정체성 정의
    INSTRUCTIONS = "TASK_INSTRUCTIONS"   # 수행해야 할 작업 지침
    FILES = "CONTEXT_KNOWLEDGE"         # 참조 지식/컨텍스트

def create_enhanced_system_prompt(
    prompt_data: Dict[str, Any], 
    engine_type: str,
    use_enhanced: bool = True
) -> str:
    """
    명확하고 효과적인 시스템 프롬프트 생성
    복잡도를 줄이고 핵심에 집중
    """
    prompt = prompt_data.get('prompt', {})
    files = prompt_data.get('files', [])
    
    # 1. DESCRIPTION - AI의 역할과 정체성
    description = prompt.get('description', f'{engine_type} 전문가')
    
    # 2. INSTRUCTIONS - 수행할 작업
    instruction = prompt.get('instruction', '주어진 정보를 분석하고 답변해주세요.')
    
    # 3. FILES - 참조 자료
    file_contexts = _process_file_contexts(files)
    
    if use_enhanced:
        # 간결하지만 효과적인 프롬프트 구조
        system_prompt = f"""## 당신의 역할
{description}

## 핵심 임무
{instruction}

이 지침을 최우선으로 준수하여 작업을 수행하세요.
{file_contexts if file_contexts else ""}

## 작업 원칙
• 위의 핵심 임무를 정확히 수행
• 제공된 참조 자료 적극 활용
• 확실한 정보 기반으로 답변
• 추측이 필요한 경우 명시적으로 표현

이 작업은 매우 중요합니다. 신중하게 단계별로 접근해주세요."""
    else:
        # 최소 구조 프롬프트
        system_prompt = f"""당신은 {description}

임무: {instruction}
{_format_file_contexts_basic(files)}"""
    
    logger.info(f"System prompt created for {engine_type}: {len(system_prompt)} chars")
    return system_prompt

def _process_file_contexts(files: List[Dict]) -> str:
    """파일 컨텍스트를 구조화하여 처리"""
    if not files:
        return ""
    
    contexts = []
    contexts.append("\n### 제공된 참조 자료:")
    
    for idx, file in enumerate(files, 1):
        file_name = file.get('fileName', f'문서_{idx}')
        file_content = file.get('fileContent', '')
        file_type = file.get('fileType', 'text')
        
        if file_content.strip():
            contexts.append(f"""
#### [{idx}] {file_name}
- 유형: {file_type}
- 내용:
```
{file_content.strip()[:5000]}  # 너무 긴 내용은 잘라냄
```""")
    
    contexts.append("\n**참조 자료 활용 지침**: 위 자료를 필요에 따라 참조하되, 주어진 지침을 우선시하세요.")
    
    return '\n'.join(contexts)

def _format_file_contexts_basic(files: List[Dict]) -> str:
    """기본 파일 컨텍스트 포맷팅"""
    if not files:
        return ""
    
    contexts = ["\n=== 참조 자료 ==="]
    for file in files:
        file_name = file.get('fileName', 'unknown')
        file_content = file.get('fileContent', '')
        if file_content.strip():
            contexts.append(f"\n[{file_name}]")
            contexts.append(file_content.strip())
    
    return '\n'.join(contexts)

def create_user_message_with_anchoring(
    user_message: str,
    response_format: Optional[str] = None,
    examples: Optional[List[str]] = None
) -> str:
    """
    Response Anchoring을 활용한 사용자 메시지 구성
    응답의 시작 부분이나 구조를 제공하여 모델의 응답을 유도
    """
    enhanced_message = user_message
    
    # 예시 추가 (Few-shot learning)
    if examples:
        enhanced_message = f"""다음은 참고할 수 있는 예시입니다:
{chr(10).join(f'예시 {i+1}: {ex}' for i, ex in enumerate(examples))}

이제 다음 질문에 답해주세요:
{user_message}"""
    
    # 응답 형식 앵커링
    if response_format:
        enhanced_message += f"\n\n응답 형식:\n{response_format}"
    
    return enhanced_message

def validate_instruction_compliance(
    response: str,
    original_instruction: str,
    validation_keywords: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    간단한 응답 검증 (선택적 사용)
    """
    # 복잡한 검증 대신 프롬프트 품질에 집중
    validation_result = {
        "response_length": len(response),
        "has_content": bool(response.strip())
    }
    
    # 선택적 키워드 체크 (필요시만)
    if validation_keywords:
        found_keywords = [kw for kw in validation_keywords if kw.lower() in response.lower()]
        validation_result["found_keywords"] = found_keywords
    
    return validation_result

def stream_claude_response_enhanced(
    user_message: str,
    system_prompt: str,
    use_cot: bool = True,
    max_retries: int = 1
) -> Iterator[str]:
    """
    향상된 Claude 스트리밍 응답 생성
    
    Args:
        user_message: 사용자 메시지
        system_prompt: 시스템 프롬프트
        use_cot: Chain-of-Thought 사용 여부
        max_retries: 재시도 횟수
    """
    # Chain-of-Thought 프롬프팅 적용
    if use_cot and "분석" in user_message or "설명" in user_message:
        user_message = f"단계별로 생각하며 답변해주세요:\n{user_message}"
    
    messages = [{"role": "user", "content": user_message}]
    
    for attempt in range(max_retries + 1):
        try:
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
                "system": system_prompt,
                "messages": messages,
                "top_p": 0.9,  # 다양성 제어
                "top_k": 40    # 선택 가능한 토큰 제한
            }
            
            logger.info(f"Calling Bedrock (attempt {attempt + 1}/{max_retries + 1})")
            logger.info(f"Request body: {json.dumps(body)[:500]}...")  # body 내용 로깅
            
            response = bedrock_runtime.invoke_model_with_response_stream(
                modelId=CLAUDE_MODEL_ID,
                body=json.dumps(body)
            )
            
            stream = response.get('body')
            if stream:
                for event in stream:
                    chunk = event.get('chunk')
                    if chunk:
                        chunk_obj = json.loads(chunk.get('bytes').decode())
                        
                        if chunk_obj.get('type') == 'content_block_delta':
                            delta = chunk_obj.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                text = delta.get('text', '')
                                if text:
                                    yield text
                        
                        elif chunk_obj.get('type') == 'message_stop':
                            logger.info("Claude streaming completed successfully")
                            return
            
        except Exception as e:
            logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
            if attempt == max_retries:
                yield f"\n\nAI 응답 생성 실패 (시도: {max_retries + 1}): {str(e)}"
            else:
                logger.info(f"Retrying in 1 second...")
                import time
                time.sleep(1)

def get_prompt_effectiveness_metrics(
    prompt_data: Dict[str, Any],
    response: str
) -> Dict[str, Any]:
    """
    프롬프트 효과성 메트릭 측정
    """
    metrics = {
        "prompt_length": len(str(prompt_data)),
        "response_length": len(response),
        "has_description": bool(prompt_data.get('prompt', {}).get('description')),
        "has_instructions": bool(prompt_data.get('prompt', {}).get('instruction')),
        "file_count": len(prompt_data.get('files', [])),
        "estimated_tokens": len(response.split()) * 1.3,  # 대략적인 토큰 추정
        "timestamp": datetime.now().isoformat()
    }
    
    return metrics

# 기존 함수와의 호환성 유지
def create_system_prompt(prompt_data: Dict[str, Any], engine_type: str) -> str:
    """기존 함수와의 호환성을 위한 래퍼"""
    return create_enhanced_system_prompt(prompt_data, engine_type, use_costar=True)

def stream_claude_response(user_message: str, system_prompt: str) -> Iterator[str]:
    """기존 함수와의 호환성을 위한 래퍼"""
    return stream_claude_response_enhanced(user_message, system_prompt)