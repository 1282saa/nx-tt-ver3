#!/usr/bin/env python3
"""
실제 기사로 테스트하는 스크립트
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lambda_handler import generate_titles

def test_with_real_article():
    # 실제 기사 예시
    real_article = """
    삼성전자가 인공지능(AI) 반도체 시장에서 새로운 돌파구를 마련했다. 
    회사는 차세대 HBM4 메모리 개발을 완료하고 2025년 상반기 양산을 시작한다고 발표했다.
    
    HBM4는 기존 HBM3 대비 처리 속도가 2배 향상되고 전력 효율은 30% 개선됐다. 
    특히 엔비디아의 차세대 GPU와 최적화된 설계로 AI 학습 속도를 획기적으로 높일 수 있다.
    
    삼성전자 관계자는 "HBM4는 글로벌 AI 반도체 시장에서 게임 체인저가 될 것"이라며 
    "이미 주요 고객사들과 공급 계약 논의를 진행 중"이라고 밝혔다.
    
    업계에서는 삼성전자가 SK하이닉스와의 HBM 경쟁에서 우위를 점할 수 있는 
    중요한 전환점이 될 것으로 평가하고 있다. 특히 엔비디아와의 협력 강화로 
    연간 10조원 규모의 매출 증대가 예상된다.
    
    한편 이번 발표로 삼성전자 주가는 장중 5% 이상 급등했으며, 
    반도체 관련주들도 동반 상승세를 보이고 있다.
    """
    
    print("=" * 60)
    print("실제 기사 제목 생성 테스트 - Claude Sonnet 4")
    print("=" * 60)
    print(f"\n[기사 내용]\n{real_article}")
    print("\n제목 생성 중...")
    
    try:
        result = generate_titles(real_article)
        
        print("\n[생성된 제목들]")
        print("-" * 40)
        for i, title in enumerate(result['titles'], 1):
            print(f"{i:2}. {title}")
        
        print("-" * 40)
        print(f"\n✅ 총 {result['count']}개의 제목 생성 완료")
        print(f"📊 사용 모델: {result['model']}")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    test_with_real_article()