#!/usr/bin/env python3
"""
로컬에서 Bedrock 연결을 테스트하는 스크립트
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lambda_handler import generate_titles

def test_title_generation():
    # 테스트용 기사 내용
    test_article = """
    서울시는 내년부터 지하철 요금을 150원 인상하기로 했다. 
    이번 인상으로 기본요금은 1,400원에서 1,550원으로 오르게 된다. 
    서울시는 만성적인 지하철 운영 적자를 해소하기 위한 불가피한 조치라고 설명했다.
    시민들은 물가 상승 시기에 추가적인 부담이 늘어난다며 우려를 표명하고 있다.
    """
    
    print("=" * 50)
    print("Bedrock Claude Sonnet 4 제목 생성 테스트")
    print("=" * 50)
    print(f"\n[테스트 기사]\n{test_article}")
    print("\n제목 생성 중...")
    
    try:
        result = generate_titles(test_article)
        
        print("\n[생성된 제목들]")
        for i, title in enumerate(result['titles'], 1):
            print(f"{i}. {title}")
        
        print(f"\n총 {result['count']}개의 제목이 생성되었습니다.")
        print(f"사용 모델: {result['model']}")
        
    except Exception as e:
        print(f"\n오류 발생: {str(e)}")
        print("\nAWS 자격 증명과 Bedrock 권한을 확인해주세요.")
        print("필요한 환경변수:")
        print("- AWS_ACCESS_KEY_ID")
        print("- AWS_SECRET_ACCESS_KEY")
        print("- AWS_REGION (기본값: us-east-1)")

if __name__ == "__main__":
    test_title_generation()