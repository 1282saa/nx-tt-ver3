"""
AWS Bedrock Claude 클라이언트 - 프롬프트 준수 강화 버전
범용 서비스로서 관리자가 정의한 어떤 프롬프트든 정확히 준수하도록 설계
"""
import boto3
import json
import logging
import re
from typing import Dict, Any, Iterator, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Bedrock Runtime 클라이언트 초기화
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Claude 4.0 모델 설정 - 준수 모드 최적화
CLAUDE_MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MAX_TOKENS = 16384  # 과도한 출력 방지
TEMPERATURE = 0.2  # 지침 준수 우선 (0.3 → 0.2)
TOP_P = 0.7       # 집중도 향상
TOP_K = 30        # 일관성 강화


class ConstraintExtractor:
    """관리자 프롬프트에서 제약 조건 자동 추출"""
    
    @staticmethod
    def extract(prompt: str) -> Dict[str, Any]:
        """프롬프트에서 구체적 제약 조건 추출"""
        constraints = {}
        
        # 1. 개수 제약
        if match := re.search(r'정확히\s*(\d+)\s*개', prompt):
            constraints['exact_count'] = int(match.group(1))
        elif match := re.search(r'(\d+)\s*개', prompt):
            constraints['target_count'] = int(match.group(1))
        
        # 2. 길이 제약 (글자수)
        if match := re.search(r'(\d+)\s*[-~]\s*(\d+)\s*자', prompt):
            constraints['char_range'] = (int(match.group(1)), int(match.group(2)))
        elif match := re.search(r'(\d+)\s*자\s*이내', prompt):
            constraints['max_chars'] = int(match.group(1))
        
        # 3. 형식 제약
        if 'JSON' in prompt.upper():
            constraints['format'] = 'json'
        elif 'XML' in prompt.upper():
            constraints['format'] = 'xml'
        elif any(word in prompt for word in ['목록', '리스트', '번호']):
            constraints['format'] = 'list'
        elif any(word in prompt for word in ['표', '테이블']):
            constraints['format'] = 'table'
        
        # 4. 필수 키워드/필드
        if '"' in prompt:
            keys = re.findall(r'"([^"]+)"', prompt)
            if keys:
                constraints['required_fields'] = keys
        
        # 5. 금지 사항
        if '하지 마' in prompt or '금지' in prompt or '제외' in prompt:
            constraints['has_prohibitions'] = True
        
        logger.info(f"Extracted constraints: {constraints}")
        return constraints


class ResponseValidator:
    """생성된 응답 검증"""
    
    @staticmethod
    def validate(response: str, constraints: Dict[str, Any]) -> Tuple[bool, str]:
        """응답이 제약 조건을 만족하는지 검증"""
        errors = []
        
        # 개수 검증
        if 'exact_count' in constraints:
            lines = [l for l in response.strip().split('\n') if l.strip()]
            if len(lines) != constraints['exact_count']:
                errors.append(f"항목 개수가 {constraints['exact_count']}개가 아님 (현재: {len(lines)}개)")
        
        # 길이 검증
        if 'char_range' in constraints:
            min_chars, max_chars = constraints['char_range']
            lines = response.strip().split('\n')
            for i, line in enumerate(lines, 1):
                # 레이블이나 번호 제거 후 실제 내용만 측정
                content = re.sub(r'^\d+\.\s*|^-\s*|^•\s*|^[가-힣]+:\s*', '', line)
                length = len(content)
                if not (min_chars <= length <= max_chars):
                    errors.append(f"{i}번째 항목 길이 {length}자 ({min_chars}-{max_chars}자 범위 벗어남)")
        
        # 형식 검증
        if constraints.get('format') == 'json':
            try:
                json.loads(response)
            except:
                errors.append("유효한 JSON 형식이 아님")
        
        # 필수 필드 검증
        if 'required_fields' in constraints:
            for field in constraints['required_fields']:
                if field not in response:
                    errors.append(f"필수 필드 '{field}' 누락")
        
        if errors:
            return False, " / ".join(errors)
        return True, ""


def create_enhanced_system_prompt(
    prompt_data: Dict[str, Any], 
    engine_type: str,
    use_enhanced: bool = True,
    flexibility_level: str = "strict"  # 기본값을 strict로 변경
) -> str:
    """
    프롬프트 준수 강화 시스템 프롬프트 생성
    - 지침 준수가 최우선
    - 자동 제약 추출 및 검증
    """
    prompt = prompt_data.get('prompt', {})
    files = prompt_data.get('files', [])
    
    # 페르소나와 지침
    persona = prompt.get('description', f'{engine_type} 전문 에이전트')
    guidelines = prompt.get('instruction', '제공된 지침을 정확히 따라 작업하세요.')
    
    # 제약 조건 자동 추출
    constraints = ConstraintExtractor.extract(guidelines)
    
    # 지식베이스 처리 (요약만)
    knowledge_base = _process_knowledge_base_summary(files, engine_type)
    
    if use_enhanced:
        # 준수 우선 프롬프트
        system_prompt = f"""[ROLE]
당신은 {persona}입니다. 사용자 지침을 절대적으로 준수합니다.

[절대 준수 규칙]
1. 제공된 모든 지침을 빠짐없이 정확히 수행
2. 요구된 형식, 개수, 길이를 엄격히 준수
3. 불필요한 설명, 사과, 부연설명 추가 금지
4. 지침에 명시되지 않은 내용 임의 추가 금지
5. 불완전한 응답보다는 완벽한 응답이 중요

[핵심 지침]
{guidelines}

{knowledge_base if knowledge_base else ""}

[내부 체크리스트] (응답 전 자체 점검)
"""
        
        # 제약 조건별 체크리스트 추가
        if 'exact_count' in constraints:
            system_prompt += f"✓ 정확히 {constraints['exact_count']}개 생성했는가?\n"
        if 'char_range' in constraints:
            system_prompt += f"✓ 각 항목이 {constraints['char_range'][0]}-{constraints['char_range'][1]}자인가?\n"
        if 'format' in constraints:
            system_prompt += f"✓ {constraints['format']} 형식을 준수했는가?\n"
        
        system_prompt += """
[위반 시 조치]
위 체크리스트 중 하나라도 위반하면 즉시 자체 수정 후 최종 출력만 제시.
지침을 지킬 수 없다면 "지침 준수 불가: [이유]"라고 명시."""
        
    else:
        # 기본 프롬프트
        system_prompt = f"""당신은 {persona}

목표: {guidelines}
{_format_knowledge_base_basic(files)}"""
    
    logger.info(f"System prompt created with strict compliance mode: {len(system_prompt)} chars")
    return system_prompt


def _process_knowledge_base_summary(files: List[Dict], engine_type: str, max_files: int = 3, max_chars: int = 500) -> str:
    """지식베이스 요약 처리 (지침 희석 방지)"""
    if not files:
        return ""
    
    contexts = ["\n## 참고 지식 (요약)"]
    
    for idx, file in enumerate(files[:max_files], 1):
        file_name = file.get('fileName', f'문서_{idx}')
        file_content = file.get('fileContent', '')
        
        if file_content.strip():
            # 긴 내용은 요약만
            content = file_content.strip()[:max_chars]
            if len(file_content) > max_chars:
                content += "..."
            
            contexts.append(f"\n### [{idx}] {file_name}")
            contexts.append(content)
    
    return '\n'.join(contexts)


def _format_knowledge_base_basic(files: List[Dict]) -> str:
    """기본 지식베이스 포맷팅"""
    if not files:
        return ""
    
    contexts = ["\n=== 참고 자료 ==="]
    for file in files[:3]:  # 최대 3개만
        file_name = file.get('fileName', 'unknown')
        file_content = file.get('fileContent', '')[:500]  # 500자로 제한
        if file_content.strip():
            contexts.append(f"\n[{file_name}]")
            contexts.append(file_content.strip())
    
    return '\n'.join(contexts)


def stream_claude_response_enhanced(
    user_message: str,
    system_prompt: str,
    use_cot: bool = False,  # 기본값 False로 변경
    max_retries: int = 2,   # 재시도 횟수 증가
    validate_constraints: bool = True  # 검증 활성화
) -> Iterator[str]:
    """
    향상된 Claude 스트리밍 응답 생성 - 검증 및 재시도 포함
    """
    # Chain-of-Thought는 기본적으로 비활성화
    # (장황한 설명 방지, 지침 준수에 집중)
    
    messages = [{"role": "user", "content": user_message}]
    
    # 제약 조건 추출 (검증용)
    constraints = {}
    if validate_constraints:
        constraints = ConstraintExtractor.extract(system_prompt + " " + user_message)
    
    best_response = ""
    best_score = 0
    
    for attempt in range(max_retries + 1):
        try:
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
                "system": system_prompt,
                "messages": messages,
                "top_p": TOP_P,
                "top_k": TOP_K,
                "stop_sequences": ["\n\n\n", "---"]  # 과도한 출력 방지
            }
            
            logger.info(f"Calling Bedrock (attempt {attempt + 1}/{max_retries + 1})")
            
            response = bedrock_runtime.invoke_model_with_response_stream(
                modelId=CLAUDE_MODEL_ID,
                body=json.dumps(body)
            )
            
            # 스트리밍 수집
            full_response = []
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
                                    full_response.append(text)
                        
                        elif chunk_obj.get('type') == 'message_stop':
                            logger.info("Claude streaming completed")
                            break
            
            # 전체 응답 조합
            response_text = ''.join(full_response)
            
            # 검증
            if validate_constraints and constraints:
                is_valid, error_msg = ResponseValidator.validate(response_text, constraints)
                
                if is_valid:
                    logger.info("Response validated successfully")
                    yield response_text
                    return
                else:
                    logger.warning(f"Validation failed: {error_msg}")
                    
                    # 재시도를 위한 메시지 수정
                    if attempt < max_retries:
                        messages = [{
                            "role": "user", 
                            "content": f"{user_message}\n\n[오류 수정 요청]\n다음 문제를 수정하여 다시 생성하세요: {error_msg}\n형식과 개수, 길이 지침을 정확히 지켜주세요."
                        }]
                        continue
                    else:
                        # 마지막 시도에서도 실패하면 가장 나은 응답 반환
                        yield response_text
                        return
            else:
                # 검증 없이 바로 반환
                yield response_text
                return
                
        except Exception as e:
            logger.error(f"Error in attempt {attempt + 1}: {str(e)}")
            if attempt == max_retries:
                yield f"\n\n[오류] AI 응답 생성 실패: {str(e)}"
            else:
                logger.info(f"Retrying in 1 second...")
                import time
                time.sleep(1)


def create_user_message_with_constraints(
    user_message: str,
    constraints: Dict[str, Any]
) -> str:
    """제약 조건을 명시적으로 포함한 사용자 메시지 생성"""
    enhanced_message = user_message
    
    if constraints:
        constraint_text = "\n\n[준수 사항]"
        if 'exact_count' in constraints:
            constraint_text += f"\n- 정확히 {constraints['exact_count']}개 생성"
        if 'char_range' in constraints:
            constraint_text += f"\n- 각 항목 {constraints['char_range'][0]}-{constraints['char_range'][1]}자"
        if 'format' in constraints:
            constraint_text += f"\n- {constraints['format']} 형식으로 출력"
        
        enhanced_message += constraint_text
    
    return enhanced_message


# 기존 함수와의 호환성 유지
def create_system_prompt(prompt_data: Dict[str, Any], engine_type: str) -> str:
    """기존 함수와의 호환성을 위한 래퍼 - strict 모드 기본 적용"""
    return create_enhanced_system_prompt(prompt_data, engine_type, use_enhanced=True, flexibility_level="strict")


def stream_claude_response(user_message: str, system_prompt: str) -> Iterator[str]:
    """기존 함수와의 호환성을 위한 래퍼 - 검증 포함"""
    return stream_claude_response_enhanced(user_message, system_prompt, validate_constraints=True)


# 메트릭 수집 함수
def get_compliance_metrics(
    prompt_data: Dict[str, Any],
    response: str
) -> Dict[str, Any]:
    """프롬프트 준수율 메트릭 측정"""
    constraints = ConstraintExtractor.extract(
        prompt_data.get('prompt', {}).get('instruction', '')
    )
    
    is_valid, error_msg = ResponseValidator.validate(response, constraints)
    
    metrics = {
        "compliance_rate": 1.0 if is_valid else 0.0,
        "validation_errors": error_msg,
        "extracted_constraints": constraints,
        "response_length": len(response),
        "timestamp": datetime.now().isoformat()
    }
    
    return metrics