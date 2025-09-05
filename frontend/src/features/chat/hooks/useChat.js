import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
// services 파일들을 features/chat/services에서 import
import {
  connectWebSocket,
  sendChatMessage,
  addMessageHandler,
  removeMessageHandler,
  isWebSocketConnected,
} from '../services/websocketService';
import {
  autoSaveConversation,
  getConversation,
} from '../services/conversationService';
import { updateLocalUsage, fetchUsageFromServer } from '../services/usageService';
import * as usageService from '../services/usageService';

export const useChat = (initialMessage, selectedEngine = "T5") => {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL에서 conversationId를 명시적으로 확인
  const urlConversationId = conversationId || window.location.pathname.split('/').pop();
  
  // 상태 관리
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    if (urlConversationId && urlConversationId !== 'chat') {
      return urlConversationId;
    }
    
    const pendingId = localStorage.getItem('pendingConversationId');
    if (pendingId) {
      localStorage.removeItem('pendingConversationId');
      return pendingId;
    }
    
    return `${selectedEngine}_${Date.now()}`;
  });
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [hasResponded, setHasResponded] = useState(false);
  const [streamingShouldEnd, setStreamingShouldEnd] = useState(false);
  const [usage, setUsage] = useState({ percentage: 0, unit: '%' });
  
  // Refs
  const messagesEndRef = useRef(null);
  const currentConversationIdRef = useRef(currentConversationId);
  const loadedConversationsRef = useRef(new Set());
  const streamingTimeoutRef = useRef(null);
  const messageIdCounterRef = useRef(0);
  
  // WebSocket 메시지 핸들러
  const handleWebSocketMessage = useCallback((data) => {
    console.log("📨 WebSocket 메시지 수신:", data);
    
    if (data.type === 'chunk') {
      setStreamingMessage(prev => {
        const updated = prev ? prev + data.content : data.content;
        return updated;
      });
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      streamingTimeoutRef.current = setTimeout(() => {
        console.log("⏰ 스트리밍 타임아웃 - 메시지 완료 처리");
        handleStreamEnd();
      }, 5000);
    } else if (data.type === 'end') {
      handleStreamEnd();
    } else if (data.type === 'error') {
      console.error("❌ WebSocket 오류:", data.message);
      setIsLoading(false);
      setStreamingMessage(null);
    }
  }, []);
  
  // 스트림 종료 처리
  const handleStreamEnd = useCallback(() => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    
    setStreamingMessage(prev => {
      if (prev) {
        const assistantMessage = {
          id: `msg-${Date.now()}-${messageIdCounterRef.current++}`,
          role: "assistant",
          content: prev,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        
        // 대화 자동 저장
        const updatedMessages = [...messages, assistantMessage];
        autoSaveConversation(
          currentConversationIdRef.current,
          updatedMessages,
          selectedEngine
        );
      }
      return null;
    });
    
    setIsLoading(false);
    setHasResponded(true);
    setStreamingShouldEnd(false);
  }, [messages, selectedEngine]);
  
  // 메시지 전송
  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    
    if (!trimmedInput || isLoading) {
      return;
    }
    
    if (!isWebSocketConnected()) {
      console.log("🔄 WebSocket 재연결 시도...");
      const connected = await connectWebSocket(selectedEngine);
      if (!connected) {
        alert("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
    }
    
    setIsLoading(true);
    const timestamp = new Date().toISOString();
    
    const userMessage = {
      id: `msg-${Date.now()}-${messageIdCounterRef.current++}`,
      role: "user",
      content: trimmedInput,
      timestamp: timestamp,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setStreamingMessage("");
    setStreamingShouldEnd(false);
    
    // WebSocket으로 메시지 전송
    sendChatMessage({
      content: trimmedInput,
      timestamp: timestamp,
      conversationId: currentConversationIdRef.current,
      messageHistory: messages,
      engine: selectedEngine,
    });
    
    // 사용량 업데이트
    await updateLocalUsage(selectedEngine);
  }, [input, isLoading, messages, selectedEngine]);
  
  // 대화 불러오기
  const loadConversation = useCallback(async (convId) => {
    if (!convId || convId === 'chat' || loadedConversationsRef.current.has(convId)) {
      return;
    }
    
    setIsLoadingConversation(true);
    loadedConversationsRef.current.add(convId);
    
    try {
      const conversation = await getConversation(convId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
        setHasResponded(true);
      }
    } catch (error) {
      console.error("대화 불러오기 실패:", error);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);
  
  // 새 대화 시작
  const startNewConversation = useCallback(() => {
    const newId = `${selectedEngine}_${Date.now()}`;
    setCurrentConversationId(newId);
    currentConversationIdRef.current = newId;
    setMessages([]);
    setInput("");
    setStreamingMessage(null);
    setHasResponded(false);
    
    // URL 업데이트
    navigate(`/chat/${newId}`, { replace: false });
  }, [selectedEngine, navigate]);
  
  // 스크롤 관리
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  // WebSocket 초기화
  useEffect(() => {
    let messageHandler;
    
    const initWebSocket = async () => {
      const connected = await connectWebSocket(selectedEngine);
      if (connected) {
        messageHandler = handleWebSocketMessage;
        addMessageHandler(messageHandler);
      }
    };
    
    initWebSocket();
    
    return () => {
      if (messageHandler) {
        removeMessageHandler(messageHandler);
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [selectedEngine, handleWebSocketMessage]);
  
  // conversationId 변경 감지
  useEffect(() => {
    if (urlConversationId && urlConversationId !== 'chat' && urlConversationId !== currentConversationId) {
      loadConversation(urlConversationId);
    }
  }, [urlConversationId, currentConversationId, loadConversation]);
  
  // 초기 메시지 처리
  useEffect(() => {
    if (initialMessage && messages.length === 0 && !hasResponded) {
      setInput(initialMessage);
      // 자동 전송은 하지 않고 사용자가 전송 버튼을 누르도록 함
    }
  }, [initialMessage, messages.length, hasResponded]);
  
  // 사용량 업데이트
  useEffect(() => {
    const updateUsage = async () => {
      const percentage = await usageService.getUsagePercentage(selectedEngine);
      setUsage({ percentage, unit: '%' });
    };
    
    updateUsage();
    fetchUsageFromServer(selectedEngine);
    
    const interval = setInterval(updateUsage, 30000);
    return () => clearInterval(interval);
  }, [selectedEngine]);
  
  // 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);
  
  return {
    // State
    messages,
    input,
    isLoading,
    isLoadingConversation,
    streamingMessage,
    hasResponded,
    usage,
    currentConversationId,
    
    // Actions
    setInput,
    sendMessage,
    startNewConversation,
    
    // Refs
    messagesEndRef,
  };
};