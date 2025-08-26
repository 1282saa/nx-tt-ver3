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
MAX_TOKENS = 16384
TEMPERATURE = 0.3  # 일관성 있는 출력을 위해 낮은 온도 유지

class PromptComponent:
    """프롬프트 컴포넌트의 역할을 명확히 정의"""
    
    PERSONA = "AGENT_PERSONA"           # AI의 페르소나/전문성 정의
    GUIDELINES = "CORE_GUIDELINES"      # 핵심 가이드라인 (유연하게 적용)
    KNOWLEDGE = "DOMAIN_KNOWLEDGE"      # 도메인 지식 베이스 (적극 활용)

def create_enhanced_system_prompt(
    prompt_data: Dict[str, Any], 
    engine_type: str,
    use_enhanced: bool = True,
    flexibility_level: str = "balanced"  # "strict", "balanced", "flexible"
) -> str:
    """
    유연하고 지능적인 시스템 프롬프트 생성
    - 지침과 지식을 균형있게 활용
    - 유연성 레벨 조절 가능
    """
    prompt = prompt_data.get('prompt', {})
    files = prompt_data.get('files', [])
    
    # 1. PERSONA - AI의 전문성과 페르소나
    persona = prompt.get('description', f'{engine_type} 전문 에이전트')
    
    # 2. GUIDELINES - 핵심 가이드라인
    guidelines = prompt.get('instruction', '제공된 지식을 활용하여 최적의 답변을 생성하세요.')
    
    # 3. KNOWLEDGE - 도메인 지식
    knowledge_base = _process_knowledge_base(files, engine_type)
    
    # 유연성 레벨에 따른 지침 강도 조절
    flexibility_phrases = {
        "strict": "다음 가이드라인을 엄격히 준수하여 작업하세요:",
        "balanced": "다음 가이드라인을 참고하되, 상황에 맞게 유연하게 적용하세요:",
        "flexible": "다음은 참고 가이드라인입니다. 창의적이고 자연스러운 응답을 우선시하세요:"
    }
    
    if use_enhanced:
        # 개선된 프롬프트 구조 - 역할 분리 명확화
        system_prompt = f"""## 전문가 페르소나
{persona}

## 핵심 가이드라인
{flexibility_phrases.get(flexibility_level, flexibility_phrases["balanced"])}
{guidelines}

{knowledge_base if knowledge_base else ""}

## 작업 접근 방식
• 가이드라인은 방향성을 제시하는 참고사항입니다
• 제공된 지식베이스를 적극적으로 활용하여 전문성 있는 답변 생성
• 사용자의 의도와 맥락을 우선 고려
• 자연스럽고 유용한 응답이 가장 중요
• 필요시 가이드라인을 유연하게 해석하여 최적의 결과 도출

💡 핵심: 지식베이스를 기반으로 전문성을 발휘하되, 과도하게 경직되지 않은 자연스러운 응답을 생성하세요."""
    else:
        # 최소 구조 프롬프트
        system_prompt = f"""당신은 {persona}

목표: {guidelines}
{_format_knowledge_base_basic(files)}"""
    
    logger.info(f"System prompt created for {engine_type} with {flexibility_level} flexibility: {len(system_prompt)} chars")
    return system_prompt

def _process_knowledge_base(files: List[Dict], engine_type: str) -> str:
    """지식베이스를 체계적으로 구성"""
    if not files:
        return ""
    
    contexts = []
    contexts.append("\n## 📚 도메인 지식베이스")
    contexts.append("다음 지식을 종합적으로 활용하여 전문적인 응답을 생성하세요:\n")
    
    for idx, file in enumerate(files, 1):
        file_name = file.get('fileName', f'문서_{idx}')
        file_content = file.get('fileContent', '')
        
        if file_content.strip():
            contexts.append(f"""
### [{idx}] {file_name}
```
{file_content.strip()}
```""")
    
    contexts.append("\n💡 **활용 가이드**: 위 지식을 적극 활용하여 전문적이고 정확한 응답을 생성하세요.")
    
    return '\n'.join(contexts)

def _format_knowledge_base_basic(files: List[Dict]) -> str:
    """기본 지식베이스 포맷팅"""
    if not files:
        return ""
    
    contexts = ["\n=== 지식베이스 ==="]
    for file in files:
        file_name = file.get('fileName', 'unknown')
        file_content = file.get('fileContent', '')
        if file_content.strip():
            contexts.append(f"\n[{file_name}]")
            contexts.append(file_content.strip())
    
    return '\n'.join(contexts)

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
                "top_p": 0.7,  # 다양성 제어
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
    # 모든 엔진에 balanced 적용 (H8도 포함)
    return create_enhanced_system_prompt(prompt_data, engine_type, use_enhanced=True, flexibility_level="balanced")

def stream_claude_response(user_message: str, system_prompt: str) -> Iterator[str]:
    """기존 함수와의 호환성을 위한 래퍼"""
    return stream_claude_response_enhanced(user_message, system_prompt)