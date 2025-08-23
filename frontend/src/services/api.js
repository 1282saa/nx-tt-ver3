// API 서비스 - Bedrock Lambda 함수 호출

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * 기사 내용을 받아 제목을 생성하는 API 호출
 * @param {string} articleContent - 기사 본문
 * @returns {Promise<Object>} 생성된 제목들
 */
export const generateTitles = async (articleContent) => {
  try {
    const response = await fetch(`${API_URL}/generate-titles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article_content: articleContent
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '제목 생성에 실패했습니다.');
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || '제목 생성에 실패했습니다.');
    }
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
};

// 로컬 테스트용 Mock 함수
export const generateTitlesMock = async (articleContent) => {
  // 로컬 개발시 사용할 Mock 데이터
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        titles: [
          "테스트 제목 1 - 주요 내용 요약",
          "테스트 제목 2 - 핵심 키워드 강조",
          "테스트 제목 3 - 감성적 접근",
          "테스트 제목 4 - 팩트 중심",
          "테스트 제목 5 - 질문형 제목",
          "테스트 제목 6 - 숫자 활용",
          "테스트 제목 7 - 인용구 활용",
          "테스트 제목 8 - 대비 강조",
          "테스트 제목 9 - 미래 전망",
          "테스트 제목 10 - 현재 상황"
        ],
        count: 10,
        model: "mock-model"
      });
    }, 1000); // 1초 지연으로 API 호출 시뮬레이션
  });
};