// 대화 저장 및 관리 서비스

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://2zzb4h3d3gnua4v47zsoboa3ya0fwrnz.lambda-url.us-east-1.on.aws';

class ConversationService {
  constructor() {
    this.userId = this.getUserId();
  }

  // 사용자 ID 가져오기 (로그인 시스템이 없으므로 임시로 localStorage 사용)
  getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  // 대화 저장
  async saveConversation(conversationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          ...conversationData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save conversation: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('💾 대화 저장 성공:', data);
      return data;
    } catch (error) {
      console.error('대화 저장 실패:', error);
      // 오류 발생 시 localStorage에 백업
      this.saveToLocalStorage(conversationData);
      throw error;
    }
  }

  // 대화 목록 조회
  async listConversations(engineType = null) {
    try {
      const params = new URLSearchParams({
        userId: this.userId
      });
      
      if (engineType) {
        params.append('engineType', engineType);
      }

      const response = await fetch(`${API_BASE_URL}/conversations?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list conversations: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 대화 목록 조회 성공:', data);
      return data.conversations || [];
    } catch (error) {
      console.error('대화 목록 조회 실패:', error);
      // 오류 발생 시 localStorage에서 조회
      return this.getFromLocalStorage(engineType);
    }
  }

  // 특정 대화 조회
  async getConversation(conversationId) {
    try {
      const params = new URLSearchParams({
        userId: this.userId
      });

      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get conversation: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📖 대화 조회 성공:', data);
      return data;
    } catch (error) {
      console.error('대화 조회 실패:', error);
      // 오류 발생 시 localStorage에서 조회
      return this.getConversationFromLocalStorage(conversationId);
    }
  }

  // 대화 삭제
  async deleteConversation(conversationId) {
    try {
      const params = new URLSearchParams({
        userId: this.userId
      });

      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}?${params}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('서버에서 삭제 실패, localStorage에서만 삭제 시도');
      } else {
        console.log('🗑️ 서버에서 대화 삭제 성공');
      }

      // localStorage에서도 삭제 (서버 삭제 실패해도 로컬은 삭제)
      this.deleteFromLocalStorage(conversationId);
      
      // 대화 히스토리도 삭제
      const conversations = JSON.parse(localStorage.getItem('conversations') || '{}');
      const conv = Object.values(conversations).find(c => c.conversationId === conversationId);
      if (conv && conv.engineType) {
        const historyKey = `chat_history_${conv.engineType}`;
        const history = localStorage.getItem(historyKey);
        if (history) {
          const messages = JSON.parse(history);
          // 해당 대화의 메시지만 제거
          const filteredMessages = messages.filter(m => !m.conversationId || m.conversationId !== conversationId);
          if (filteredMessages.length === 0) {
            localStorage.removeItem(historyKey);
          } else {
            localStorage.setItem(historyKey, JSON.stringify(filteredMessages));
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('대화 삭제 중 오류:', error);
      // 서버 오류여도 localStorage는 삭제
      this.deleteFromLocalStorage(conversationId);
      return true;
    }
  }

  // 자동 저장 (debounced)
  autoSave(conversationData) {
    // 이전 타이머가 있으면 취소
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 3초 후에 저장
    this.saveTimer = setTimeout(() => {
      this.saveConversation(conversationData).catch(error => {
        console.error('자동 저장 실패:', error);
      });
    }, 3000);
  }

  // === localStorage 백업 메서드들 ===

  saveToLocalStorage(conversationData) {
    try {
      const key = `conversation_${conversationData.engineType}_${conversationData.conversationId || Date.now()}`;
      const conversations = JSON.parse(localStorage.getItem('conversations') || '{}');
      conversations[key] = {
        ...conversationData,
        userId: this.userId,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('conversations', JSON.stringify(conversations));
      console.log('💾 localStorage에 백업 저장');
    } catch (error) {
      console.error('localStorage 저장 실패:', error);
    }
  }

  getFromLocalStorage(engineType = null) {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '{}');
      let conversationList = Object.values(conversations);
      
      // 사용자 필터링
      conversationList = conversationList.filter(conv => conv.userId === this.userId);
      
      // 엔진 타입 필터링
      if (engineType) {
        conversationList = conversationList.filter(conv => conv.engineType === engineType);
      }
      
      // 최신순 정렬
      conversationList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return conversationList;
    } catch (error) {
      console.error('localStorage 조회 실패:', error);
      return [];
    }
  }

  getConversationFromLocalStorage(conversationId) {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '{}');
      const conversation = Object.values(conversations).find(
        conv => conv.conversationId === conversationId && conv.userId === this.userId
      );
      return conversation || null;
    } catch (error) {
      console.error('localStorage 조회 실패:', error);
      return null;
    }
  }

  deleteFromLocalStorage(conversationId) {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '{}');
      const key = Object.keys(conversations).find(
        k => conversations[k].conversationId === conversationId && conversations[k].userId === this.userId
      );
      if (key) {
        delete conversations[key];
        localStorage.setItem('conversations', JSON.stringify(conversations));
        console.log('🗑️ localStorage에서 삭제');
      }
    } catch (error) {
      console.error('localStorage 삭제 실패:', error);
    }
  }

  // 대화 동기화 (localStorage → DynamoDB)
  async syncConversations() {
    try {
      const localConversations = this.getFromLocalStorage();
      console.log(`🔄 ${localConversations.length}개 대화 동기화 시작`);
      
      for (const conversation of localConversations) {
        try {
          await this.saveConversation(conversation);
        } catch (error) {
          console.error('대화 동기화 실패:', conversation.conversationId, error);
        }
      }
      
      console.log('✅ 대화 동기화 완료');
    } catch (error) {
      console.error('대화 동기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스
const conversationService = new ConversationService();

export default conversationService;

// 편의 함수들
export const saveConversation = (data) => conversationService.saveConversation(data);
export const listConversations = (engineType) => conversationService.listConversations(engineType);
export const getConversation = (id) => conversationService.getConversation(id);
export const deleteConversation = (id) => conversationService.deleteConversation(id);
export const autoSaveConversation = (data) => conversationService.autoSave(data);
export const syncConversations = () => conversationService.syncConversations();