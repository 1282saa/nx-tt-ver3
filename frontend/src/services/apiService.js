import authService from './authService';

class ApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_AWS_API_GATEWAY_URL || 'https://nx-tt-dev-ver3-api-gateway.execute-api.us-east-1.amazonaws.com/prod';
  }

  // 공통 헤더 생성
  async getHeaders() {
    const token = await authService.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // GET 요청
  async get(endpoint) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GET 요청 오류:', error);
      throw error;
    }
  }

  // POST 요청
  async post(endpoint, data) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('POST 요청 오류:', error);
      throw error;
    }
  }

  // PUT 요청
  async put(endpoint, data) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PUT 요청 오류:', error);
      throw error;
    }
  }

  // DELETE 요청
  async delete(endpoint) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      return response.status === 204 ? {} : await response.json();
    } catch (error) {
      console.error('DELETE 요청 오류:', error);
      throw error;
    }
  }

  // 사용량 데이터 저장
  async saveUsageData(userId, engineType, inputTokens, outputTokens) {
    return this.post('/usage', {
      userId,
      engineType,
      inputTokens,
      outputTokens,
      timestamp: new Date().toISOString(),
    });
  }

  // 사용량 데이터 조회
  async getUserUsage(userId, engineType = null) {
    const endpoint = engineType 
      ? `/usage/${userId}?engine=${engineType}`
      : `/usage/${userId}`;
    return this.get(endpoint);
  }

  // 대화 저장
  async saveConversation(conversationData) {
    return this.post('/conversations', conversationData);
  }

  // 대화 목록 조회
  async getConversations(userId, engineType = null) {
    const endpoint = engineType 
      ? `/conversations/${userId}?engine=${engineType}`
      : `/conversations/${userId}`;
    return this.get(endpoint);
  }

  // 특정 대화 조회
  async getConversation(conversationId) {
    return this.get(`/conversations/${conversationId}`);
  }

  // 대화 삭제
  async deleteConversation(conversationId) {
    return this.delete(`/conversations/${conversationId}`);
  }
}

export default new ApiService();