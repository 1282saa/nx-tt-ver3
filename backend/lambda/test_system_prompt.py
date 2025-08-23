#!/usr/bin/env python3
"""
시스템 프롬프트 구성 테스트 스크립트
실제 DB에서 데이터를 조회하여 시스템 프롬프트를 구성하는 과정을 테스트
"""

import sys
import os
import requests
import json
from datetime import datetime

# 공통 라이브러리 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'shared'))

def test_prompt_data_loading():
    """REST API를 통해 T5/H8 데이터 로딩 테스트"""
    
    print("🔍 Testing prompt data loading...")
    print("=" * 50)
    
    api_base = "https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com"
    
    for engine in ['T5', 'H8']:
        print(f"\n📊 Testing {engine} engine:")
        print("-" * 30)
        
        try:
            # REST API로 프롬프트 데이터 조회
            response = requests.get(f"{api_base}/prompts/{engine}")
            response.raise_for_status()
            
            data = response.json()
            prompt = data.get('prompt', {})
            files = data.get('files', [])
            
            print(f"✅ {engine} 데이터 로드 성공")
            print(f"   - Description: {prompt.get('description', 'N/A')[:100]}...")
            print(f"   - Instruction: {prompt.get('instruction', 'N/A')[:100]}...")
            print(f"   - Files: {len(files)}개")
            
            # 시스템 프롬프트 구성 테스트
            system_prompt = create_system_prompt(data, engine)
            print(f"   - System Prompt Length: {len(system_prompt)} characters")
            
            # 샘플 시스템 프롬프트 출력
            print(f"\n📝 {engine} System Prompt Sample (처음 300자):")
            print("-" * 40)
            print(system_prompt[:300] + "...")
            
        except Exception as e:
            print(f"❌ {engine} 테스트 실패: {str(e)}")

def create_system_prompt(prompt_data, engine_type):
    """시스템 프롬프트 구성 (Bedrock 클라이언트와 동일한 로직)"""
    
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
1. 주어진 지침을 정확히 따라 제목을 생성하세요
2. 각 스타일별로 명확하게 구분하여 제시하세요
3. 한국어로 자연스럽고 매력적인 제목을 만드세요
4. 뉴스 제목의 정확성과 가독성을 고려하세요"""
    
    return system_prompt

def test_user_journey_simulation():
    """사용자 질의 → 시스템 프롬프트 구성 과정 시뮬레이션"""
    
    print("\n\n🎯 User Journey Simulation")
    print("=" * 50)
    
    # 시뮬레이션할 사용자 질의들
    test_queries = [
        "삼성전자가 새로운 스마트폰을 출시한다는 소식에 대한 뉴스 제목을 만들어주세요",
        "정부가 부동산 규제를 완화한다는 발표에 대한 제목을 생성해주세요",
        "K-POP 그룹이 빌보드 1위를 차지했다는 뉴스 제목을 작성해주세요"
    ]
    
    engines = ['T5', 'H8']
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🎤 Test Query {i}: {query[:50]}...")
        print("-" * 60)
        
        for engine in engines:
            try:
                # 1. DB에서 프롬프트 데이터 조회 (REST API 시뮬레이션)
                api_base = "https://o96dgrd6ji.execute-api.us-east-1.amazonaws.com"
                response = requests.get(f"{api_base}/prompts/{engine}")
                response.raise_for_status()
                
                prompt_data = response.json()
                
                # 2. 시스템 프롬프트 구성
                system_prompt = create_system_prompt(prompt_data, engine)
                
                # 3. 처리 결과 출력
                print(f"  🔧 {engine} Engine:")
                print(f"     - DB 조회: ✅ (프롬프트: {bool(prompt_data.get('prompt'))}, 파일: {len(prompt_data.get('files', []))}개)")
                print(f"     - 시스템 프롬프트: ✅ ({len(system_prompt)} characters)")
                print(f"     - Bedrock 호출 준비: ✅")
                
                # 4. 실제로는 여기서 Bedrock 호출하고 WebSocket 스트리밍
                print(f"     - 🤖 → 실제 환경에서는 Bedrock Claude 호출 + WebSocket 스트리밍")
                
            except Exception as e:
                print(f"     ❌ {engine} 처리 실패: {str(e)}")

if __name__ == "__main__":
    print("🚀 nx-tt-dev-ver3 System Test")
    print(f"⏰ Test Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # 테스트 실행
    test_prompt_data_loading()
    test_user_journey_simulation()
    
    print("\n\n✅ 시스템 테스트 완료!")
    print("🔗 Next: WebSocket 클라이언트로 실제 Bedrock 연동 테스트")