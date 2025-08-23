/**
 * WebSocket 서비스 - 실시간 AI 채팅
 * AWS API Gateway WebSocket API와 연동
 */

const WS_ENDPOINT = import.meta.env.VITE_WEBSOCKET_URL || 'wss://hsdpbajz23.execute-api.us-east-1.amazonaws.com/prod';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3초
  }

  // 연결 상태 확인
  isWebSocketConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // WebSocket 연결
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 WebSocket 연결 시도:', WS_ENDPOINT);
        
        this.ws = new WebSocket(WS_ENDPOINT);
        
        this.ws.onopen = (event) => {
          console.log('✅ WebSocket 연결 성공');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // 연결 핸들러들 호출
          this.connectionHandlers.forEach(handler => {
            try {
              handler({ type: 'connected', event });
            } catch (error) {
              console.error('Connection handler error:', error);
            }
          });
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket 메시지 수신:', message.type);
            
            // 메시지 핸들러들 호출
            this.messageHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('Message handler error:', error);
              }
            });
            
          } catch (error) {
            console.error('메시지 파싱 오류:', error, event.data);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket 연결 종료:', event.code, event.reason);
          this.isConnected = false;
          
          // 연결 핸들러들 호출
          this.connectionHandlers.forEach(handler => {
            try {
              handler({ type: 'disconnected', event });
            } catch (error) {
              console.error('Disconnection handler error:', error);
            }
          });
          
          // 자동 재연결 시도 (정상 종료가 아닌 경우)
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${this.reconnectDelay/1000}초 후)`);
            
            setTimeout(() => {
              this.connect().catch(console.error);
            }, this.reconnectDelay);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket 오류:', error);
          this.isConnected = false;
          reject(error);
        };
        
      } catch (error) {
        console.error('WebSocket 연결 실패:', error);
        reject(error);
      }
    });
  }

  // WebSocket 연결 해제
  disconnect() {
    if (this.ws) {
      console.log('🔌 WebSocket 연결 해제');
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
      this.isConnected = false;
    }
  }

  // 메시지 전송
  sendMessage(message, engineType = 'T5') {
    return new Promise((resolve, reject) => {
      if (!this.isWebSocketConnected()) {
        reject(new Error('WebSocket이 연결되지 않았습니다'));
        return;
      }

      try {
        const payload = {
          action: 'sendMessage',
          message: message,
          engineType: engineType,
          timestamp: new Date().toISOString()
        };
        
        console.log('📤 메시지 전송:', {
          message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
          engineType,
          action: payload.action
        });
        
        this.ws.send(JSON.stringify(payload));
        resolve();
        
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        reject(error);
      }
    });
  }

  // 메시지 핸들러 등록
  onMessage(handler) {
    this.messageHandlers.push(handler);
    
    // 핸들러 제거 함수 반환
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  // 연결 상태 핸들러 등록
  onConnection(handler) {
    this.connectionHandlers.push(handler);
    
    // 핸들러 제거 함수 반환
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  // 연결 재시도
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    return this.connect();
  }
}

// 싱글톤 인스턴스
const websocketService = new WebSocketService();

export default websocketService;

// 편의 함수들
export const connectWebSocket = () => websocketService.connect();
export const disconnectWebSocket = () => websocketService.disconnect();
export const sendChatMessage = (message, engineType) => websocketService.sendMessage(message, engineType);
export const onWebSocketMessage = (handler) => websocketService.onMessage(handler);
export const onWebSocketConnection = (handler) => websocketService.onConnection(handler);
export const isWebSocketConnected = () => websocketService.isWebSocketConnected();