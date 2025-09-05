import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import { ArrowUp, Plus, Settings } from "lucide-react";
import Header from "../../../shared/components/layout/Header";
import clsx from "clsx";
import {
  connectWebSocket,
  sendChatMessage,
  addMessageHandler,
  removeMessageHandler,
  isWebSocketConnected,
} from "../services/websocketService";
import {
  autoSaveConversation,
  getConversation,
} from "../services/conversationService";
import { updateLocalUsage, fetchUsageFromServer } from "../services/usageService";
import * as usageService from "../services/usageService";
import { useParams, useLocation } from "react-router-dom";
// LoadingSpinner import 제거됨
import StreamingAssistantMessage from "./StreamingAssistantMessage";
import AssistantMessage from "./AssistantMessage";

const ChatPage = ({
  initialMessage: propsInitialMessage,
  userRole,
  selectedEngine = "T5",
  onLogout,
  onBackToLanding,
  onToggleSidebar,
  isSidebarOpen = false,
  onNewConversation,
  onDashboard,
}) => {
  const { conversationId } = useParams();
  const location = useLocation();
  
  // localStorage에서 pendingMessage 확인 (우선순위 높음)
  const [initialMessage] = useState(() => {
    const pendingMessage = localStorage.getItem('pendingMessage');
    if (pendingMessage) {
      console.log("📦 localStorage에서 메시지 복원:", pendingMessage);
      localStorage.removeItem('pendingMessage'); // 사용 후 즉시 삭제
      return pendingMessage;
    }
    return propsInitialMessage;
  });
  
  // URL에서 conversationId를 명시적으로 확인
  const urlConversationId = conversationId || window.location.pathname.split('/').pop();
  
  console.log("🔍 URL 확인:", {
    conversationId,
    urlConversationId,
    pathname: window.location.pathname,
    hasConversationId: !!urlConversationId && urlConversationId !== 'chat',
    locationState: location.state
  });
  
  // URL에 conversationId가 있으면 그것을 사용, 없으면 localStorage에서 확인
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    if (urlConversationId && urlConversationId !== 'chat') {
      console.log("✅ URL에서 conversationId 사용:", urlConversationId);
      return urlConversationId;
    }
    
    // localStorage에서 pendingConversationId 확인
    const pendingId = localStorage.getItem('pendingConversationId');
    if (pendingId) {
      console.log("📦 localStorage에서 conversationId 복원:", pendingId);
      localStorage.removeItem('pendingConversationId');
      return pendingId;
    }
    
    // 둘 다 없으면 새로 생성
    const newId = `${selectedEngine}_${Date.now()}`;
    console.log("🆕 새 conversationId 생성:", newId);
    return newId;
  });
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [messages, setMessages] = useState(() => {
    console.log("🎯 ChatPage 초기화 - initialMessage:", initialMessage);
    console.log("🎯 URL conversationId:", urlConversationId);

    let hasCachedData = false;

    // URL에 conversationId가 있으면 먼저 캐시에서 복원 시도
    if (urlConversationId && urlConversationId !== 'chat' && urlConversationId !== selectedEngine.toLowerCase()) {
      console.log("🌐 URL에서 conversationId 감지, 캐시 확인 중...");
      
      // 1. localStorage에서 캐시된 대화 내용 확인
      const cacheKey = `conv:${urlConversationId}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedMessages = JSON.parse(cachedData);
          console.log("💾 캐시에서 대화 복원:", parsedMessages.length, "개 메시지");
          hasCachedData = true;
          // 타임스탬프 복원
          const restoredMessages = parsedMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          return restoredMessages;
        } catch (error) {
          console.error("캐시 파싱 실패:", error);
        }
      }
      
      console.log("캐시 없음, 서버에서 로드 예정");
    }

    // 새 채팅인 경우 초기 메시지 설정
    // initialMessage가 있고, 캐시된 대화가 없는 경우
    if (initialMessage && !hasCachedData) {
      const initialUserMessage = {
        id: crypto.randomUUID(),
        type: "user",
        content: initialMessage,
        timestamp: new Date(),
      };
      console.log("📝 초기 사용자 메시지 생성:", {
        id: initialUserMessage.id,
        type: initialUserMessage.type,
        content: initialUserMessage.content,
        contentLength: initialUserMessage.content?.length
      });
      return [initialUserMessage];
    }
    
    return [];
  });

  // 대화 로드 상태 추적을 위한 ref
  const loadedConversationRef = useRef(null);
  
  // 메시지가 변경될 때마다 캐시에 저장
  useEffect(() => {
    if (messages.length > 0 && currentConversationId) {
      const cacheKey = `conv:${currentConversationId}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(messages));
        console.log("💾 대화 캐시 저장:", messages.length, "개 메시지");
      } catch (error) {
        console.error("캐시 저장 실패:", error);
      }
    }
  }, [messages, currentConversationId]);
  
  // 컴포넌트 마운트 시 사용량 초기화
  useEffect(() => {
    const initializeUsage = async () => {
      try {
        console.log("📊 초기 사용량 데이터 로딩...");
        
        // 먼저 로컬 스토리지에서 캐시된 값 확인
        const cachedValue = localStorage.getItem(`usage_percentage_${selectedEngine}`);
        if (cachedValue !== null) {
          setUsagePercentage(parseInt(cachedValue));
          console.log(`📦 캐시된 사용량: ${cachedValue}%`);
        }
        
        // 비동기로 서버에서 최신 데이터 가져오기
        const percentage = await usageService.getUsagePercentage(selectedEngine, false); // 캐시 사용 허용
        setUsagePercentage(percentage);
        console.log(`✅ ${selectedEngine} 초기 사용량: ${percentage}%`);
        
        // 헤더 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent("usageUpdated"));
      } catch (error) {
        console.error("초기 사용량 로딩 실패:", error);
        // 실패 시 기본값
        setUsagePercentage(0);
      }
    };
    
    initializeUsage();
  }, [selectedEngine]);
  
  // 기존 대화 불러오기 - URL 변경 또는 새로고침 시
  useEffect(() => {
    const loadConversationId = urlConversationId && urlConversationId !== 'chat' ? urlConversationId : null;
    
    console.log("🔄 대화 로딩 useEffect 트리거:", {
      loadConversationId,
      conversationId,
      urlConversationId,
      currentConversationId,
      hasLocationState: !!location.state,
      hasInitialMessage: !!location.state?.initialMessage,
      messagesLength: messages.length,
      loadedConversation: loadedConversationRef.current,
      isCurrentlyStreaming: !!currentAssistantMessageId.current,
      streamingMessageId: currentAssistantMessageId.current
    });
    
    // URL에 conversationId가 있고, 아직 로드하지 않은 경우
    if (loadConversationId && loadedConversationRef.current !== loadConversationId) {
        setIsLoadingConversation(true);
        setCurrentConversationId(loadConversationId);
        
        console.log("📞 대화 불러오기 API 호출:", loadConversationId);
        getConversation(loadConversationId)
          .then((response) => {
            console.log("🔍 서버 응답 전체 데이터:", response);
            
            // 실제 conversation 데이터 추출
            // 응답 null 체크 추가
            if (!response) {
              console.warn("⚠️ 서버 응답이 null입니다");
              return;
            }
            
            const conversationData = response.conversation || response;
            console.log("📋 추출된 conversation 데이터:", conversationData);
            
            if (conversationData && conversationData.messages) {
              console.log(
                "📥 서버에서 대화 복원:",
                conversationData.messages.length,
                "개 메시지"
              );
              
              // 각 메시지 구조 로그
              conversationData.messages.forEach((msg, index) => {
                console.log(`📄 메시지 ${index + 1}:`, {
                  id: msg.id,
                  type: msg.type,
                  role: msg.role,
                  content: msg.content?.substring(0, 100) + "...",
                  timestamp: msg.timestamp
                });
              });
              
              const processedMessages = conversationData.messages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
              
              console.log("✅ 처리된 메시지들:", processedMessages);
              
              // 🔑 핵심 수정: 현재 스트리밍 중인 AI 메시지가 있는지 확인
              setMessages((currentMessages) => {
                const hasStreamingAI = currentMessages.some(msg => 
                  msg.type === 'assistant' && msg.isStreaming && msg.id === currentAssistantMessageId.current
                );
                
                if (hasStreamingAI) {
                  // 스트리밍 중인 AI 메시지가 있으면 서버 데이터와 병합
                  const streamingMessage = currentMessages.find(msg => 
                    msg.type === 'assistant' && msg.isStreaming && msg.id === currentAssistantMessageId.current
                  );
                  
                  console.log("🔄 스트리밍 중인 AI 메시지 보존:", {
                    streamingMessageId: streamingMessage?.id,
                    streamingContent: streamingMessage?.content?.substring(0, 50) + "...",
                    serverMessagesCount: processedMessages.length
                  });
                  
                  // 서버 메시지 + 현재 스트리밍 메시지 병합
                  return [...processedMessages, streamingMessage];
                } else {
                  // 스트리밍 중인 메시지가 없으면 서버 데이터로 교체
                  console.log("📥 스트리밍 없음, 서버 데이터로 교체");
                  return processedMessages;
                }
              });
              
              // 서버에서 가져온 데이터를 캐시에 저장
              const cacheKey = `conv:${loadConversationId}`;
              try {
                localStorage.setItem(cacheKey, JSON.stringify(processedMessages));
                console.log("💾 서버 데이터를 캐시에 저장");
              } catch (error) {
                console.error("캐시 저장 실패:", error);
              }
              
              loadedConversationRef.current = loadConversationId; // 로드 완료 표시
            } else {
              console.warn("⚠️ messages가 없음. 전체 구조:", {
                response,
                conversationData,
                hasConversation: !!response.conversation,
                hasMessages: !!(conversationData && conversationData.messages)
              });
            }
          })
          .catch((error) => {
            console.error("서버에서 대화 불러오기 실패:", error);
          })
          .finally(() => {
            setIsLoadingConversation(false);
            setTimeout(() => setIsLoadingConversation(false), 100);
          });
    } else if (!loadConversationId) {
      // 새 대화인 경우
      const newConversationId = `${selectedEngine}_${Date.now()}`;
      setCurrentConversationId(newConversationId);
      setMessages([]);
      setIsLoadingConversation(false);
    }
  }, [urlConversationId, location.pathname]); // URL 변경 감지
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const currentAssistantMessageId = useRef(null);
  const hasProcessedInitial = useRef(false);
  const expectedChunkIndex = useRef(0); // 청크 순서 추적
  const [usagePercentage, setUsagePercentage] = useState(null); // 사용량 퍼센티지 - null로 시작하여 로딩 상태 표시
  const streamingTimeoutRef = useRef(null); // 스트리밍 타임아웃 추적
  const chunkBuffer = useRef(new Map()); // 청크 버퍼 (index -> chunk 내용)
  const processBufferTimeoutRef = useRef(null); // 버퍼 처리 타임아웃
  const lastUserMessageRef = useRef(null); // 마지막 사용자 메시지 추적

  // 🔑 핵심 개선: 실시간 데이터 추적을 위한 ref
  const streamingContentRef = useRef(""); // 스트리밍 콘텐츠 실시간 추적
  const lastAiMessageRef = useRef(null); // 마지막 AI 메시지 추적

  // 청크 버퍼 처리 함수
  const processChunkBuffer = () => {
    const buffer = chunkBuffer.current;
    let nextExpectedIndex = expectedChunkIndex.current;
    let processedChunks = [];

    // 연속된 청크들을 찾아서 처리
    while (buffer.has(nextExpectedIndex)) {
      const chunkText = buffer.get(nextExpectedIndex);
      processedChunks.push(chunkText);
      buffer.delete(nextExpectedIndex);
      nextExpectedIndex++;
    }

    if (processedChunks.length > 0) {
      const combinedText = processedChunks.join("");
      expectedChunkIndex.current = nextExpectedIndex;

      // 먼저 ref 업데이트
      const newContent = streamingContentRef.current + combinedText;
      streamingContentRef.current = newContent;

      console.log(
        `🔄 버퍼에서 ${processedChunks.length}개 청크 처리: (길이: ${combinedText.length}, 총: ${newContent.length})`
      );

      // 스트리밍 content 상태 업데이트
      setStreamingContent(newContent);

      // 메시지 업데이트 - isStreaming 상태 유지
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === currentAssistantMessageId.current
            ? { ...msg, content: newContent, isStreaming: true }
            : msg
        )
      );
    }

    // 버퍼에 남은 청크가 있으면 다시 타임아웃 설정 (더 부드러운 타이핑을 위해 80ms로 조정)
    if (buffer.size > 0) {
      processBufferTimeoutRef.current = setTimeout(processChunkBuffer, 50);
    }
  };

  // 사용량 퍼센티지 초기화 및 업데이트
  useEffect(() => {
    // 컴포넌트 마운트 시 서버에서 실제 사용량 가져오기
    const loadUsage = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        // conversationService.js와 동일한 순서로 userId 가져오기
        const userId = userInfo.username || userInfo.userId || userInfo.email || 'anonymous';  // UUID 우선
        
        // 서버에서 사용량 가져오기 시도
        await fetchUsageFromServer(userId, selectedEngine);
      } catch (error) {
        console.log('서버 사용량 조회 실패, 로컬 데이터 사용:', error);
      }
      
      // 로컬 또는 서버에서 가져온 사용량으로 업데이트
      usageService.getUsagePercentage(selectedEngine, true).then(percentage => {
        setUsagePercentage(percentage);
      });
    };
    
    loadUsage();
  }, [selectedEngine, messages]);

  // WebSocket 초기화 및 메시지 핸들러 설정
  useEffect(() => {
    // 컴포넌트 마운트 시 모든 스트리밍 상태 완전 초기화
    console.log("🔄 ChatPage 초기화 - 모든 스트리밍 상태 리셋", {
      initialMessage,
      selectedEngine,
      timestamp: new Date().toISOString(),
    });
    setStreamingContent("");
    streamingContentRef.current = ""; // 🔑 ref도 초기화
    setIsLoading(false);
    setError(null);
    currentAssistantMessageId.current = null;
    expectedChunkIndex.current = 0;
    chunkBuffer.current.clear();

    // WebSocket 메시지 핸들러 등록
    // WebSocket 메시지 핸들러
    const handleWebSocketMessage = (message) => {
      // websocketService에서 이미 로깅하므로 중복 로깅 제거

      switch (message.type) {
        case "chat_start":
          // 무시 - UI에 표시하지 않음
          console.log(`${message.engine} 엔진 시작`);
          return; // 아무것도 하지 않고 종료

        case "data_loaded":
          // 무시 - UI에 표시하지 않음
          console.log(`데이터 로드 완료: ${message.file_count}개 파일`);
          return; // 아무것도 하지 않고 종료

        case "ai_start":
          // AI 응답 시작 - 새 메시지 생성
          const newMessageId = Date.now();

          console.log("🤖 AI 응답 시작 신호 수신:", {
            messageId: newMessageId,
            timestamp: message.timestamp,
            currentMessages: messages.length,
            previousStreamingContent: streamingContent,
            currentAssistantMessageId: currentAssistantMessageId.current,
          });

          // 이미 AI 메시지가 처리 중이면 무시 (중복 방지)
          if (currentAssistantMessageId.current) {
            console.log("⚠️ 이미 AI 메시지 처리 중, 중복 ai_start 무시");
            return;
          }

          // 이전 스트리밍 상태 완전히 정리
          setStreamingContent("");
          streamingContentRef.current = ""; // 🔑 ref도 초기화
          setIsLoading(true);
          setError(null);
          currentAssistantMessageId.current = newMessageId;
          expectedChunkIndex.current = 0; // 청크 인덱스 초기화
          chunkBuffer.current.clear(); // 청크 버퍼 초기화

          // 기존 버퍼 처리 타임아웃 클리어
          if (processBufferTimeoutRef.current) {
            clearTimeout(processBufferTimeoutRef.current);
            processBufferTimeoutRef.current = null;
          }

          console.log("🔄 스트리밍 상태 초기화 완료:", {
            messageId: newMessageId,
            expectedChunkIndex: 0,
            bufferCleared: true,
          });

          // 스트리밍 타임아웃 설정 (30초)
          streamingTimeoutRef.current = setTimeout(() => {
            console.warn("스트리밍 타임아웃! 강제 종료");
            setIsLoading(false);
            setError("응답 시간이 초과되었습니다. 다시 시도해주세요.");
            currentAssistantMessageId.current = null;
            setStreamingContent("");
            expectedChunkIndex.current = 0;
          }, 300000);

          setMessages((prev) => {
            const newMessages = [
              ...prev,
              {
                id: newMessageId,
                type: "assistant",
                content: "",
                timestamp: new Date(),
                isStreaming: true,
              },
            ];
            console.log("✅ AI 메시지 컨테이너 추가:", {
              totalMessages: newMessages.length,
              assistantMessageId: newMessageId,
              messages: newMessages.map(m => ({
                id: m.id,
                type: m.type,
                content: m.content?.substring(0, 20),
                isStreaming: m.isStreaming
              }))
            });
            return newMessages;
          });
          break;

        case "ai_chunk":
          // 스트리밍이 종료되었으면 청크 무시
          if (!currentAssistantMessageId.current) {
            return; // 조용히 무시
          }
          
          // 스트리밍 청크 수신 - 간단하게 순차 처리
          if (message.chunk && currentAssistantMessageId.current) {
            const chunkText = message.chunk;
            const receivedIndex = message.chunk_index || 0;

            // 현재 기대하는 인덱스와 일치하면 바로 처리
            if (receivedIndex === expectedChunkIndex.current) {
              // 먼저 ref 업데이트
              const newContent = streamingContentRef.current + chunkText;
              streamingContentRef.current = newContent;
              
              console.log(`📊 스트리밍 진행:`, {
                chunkIndex: receivedIndex,
                addedLength: chunkText.length,
                totalLength: newContent.length,
                preview: newContent.substring(newContent.length - 50),
              });

              // 스트리밍 콘텐츠 상태 업데이트
              setStreamingContent(newContent);

              // 메시지 업데이트
              setMessages((prevMessages) => {
                console.log("📝 메시지 업데이트 전:", {
                  messagesCount: prevMessages.length,
                  currentAssistantId: currentAssistantMessageId.current,
                  messages: prevMessages.map(m => ({
                    id: m.id,
                    type: m.type,
                    contentLength: m.content?.length,
                    isStreaming: m.isStreaming
                  }))
                });
                
                const updated = prevMessages.map((msg) =>
                  msg.id === currentAssistantMessageId.current
                    ? { ...msg, content: newContent, isStreaming: true }
                    : msg
                );

                // 🔑 마지막 AI 메시지 ref 업데이트
                const updatedAiMsg = updated.find(
                  (msg) => msg.id === currentAssistantMessageId.current
                );
                if (updatedAiMsg) {
                  lastAiMessageRef.current = updatedAiMsg;
                }
                
                console.log("📝 메시지 업데이트 후:", {
                  messagesCount: updated.length,
                  updatedMessage: updatedAiMsg ? {
                    id: updatedAiMsg.id,
                    contentLength: updatedAiMsg.content?.length,
                    contentPreview: updatedAiMsg.content?.substring(0, 50)
                  } : null
                });

                return updated;
              });

              expectedChunkIndex.current++;

              // 버퍼에 있는 다음 청크들 확인
              processChunkBuffer();
            } else {
              // 순서가 맞지 않으면 버퍼에 저장
              console.log(`⏸️ 청크 ${receivedIndex} 버퍼에 저장:`, {
                expected: expectedChunkIndex.current,
                received: receivedIndex,
                text: chunkText,
                bufferSize: chunkBuffer.current.size + 1,
              });
              chunkBuffer.current.set(receivedIndex, chunkText);
            }
          }
          break;

        case "chat_end":
          console.log("🎯 chat_end 메시지 수신됨", message);

          // conversationId는 클라이언트 것을 유지 (서버 것은 무시)
          if (message.conversationId && message.conversationId !== currentConversationId) {
            console.log("⚠️ 서버 conversationId 무시:", message.conversationId, "클라이언트 유지:", currentConversationId);
            // setCurrentConversationId(message.conversationId); // 서버 ID는 사용하지 않음

            // 사이드바 새로고침 트리거
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("refreshSidebar"));
            }
          }

          // 스트리밍 종료 및 즉시 초기화
          if (currentAssistantMessageId.current) {
            // 모든 타임아웃 클리어
            if (streamingTimeoutRef.current) {
              clearTimeout(streamingTimeoutRef.current);
              streamingTimeoutRef.current = null;
            }
            if (processBufferTimeoutRef.current) {
              clearTimeout(processBufferTimeoutRef.current);
              processBufferTimeoutRef.current = null;
            }

            // 마지막 버퍼 처리 강제 실행
            processChunkBuffer();

            // 🔑 핵심 수정: ref에서 최종 콘텐츠 가져오기
            const finalContent =
              streamingContentRef.current || streamingContent;
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === currentAssistantMessageId.current
                  ? {
                      ...msg,
                      content: finalContent || msg.content,
                      isStreaming: false,
                    }
                  : msg
              );

              // 🔑 최종 AI 메시지 ref 업데이트
              const finalAiMsg = updated.find(
                (msg) => msg.id === currentAssistantMessageId.current
              );
              if (finalAiMsg) {
                lastAiMessageRef.current = finalAiMsg;
              }

              // AI 응답 완료 후 대화 저장 (사용자 메시지 + AI 응답 모두 포함)
              console.log("🔍 대화 저장 조건 확인:", {
                currentConversationId,
                hasFinalContent: !!finalContent,
                finalContentLength: finalContent?.length,
                willSave: !!(currentConversationId && finalContent)
              });
              
              if (currentConversationId && finalContent) {
                const messagesToSave = updated.filter((m) => !m.isStreaming && m.content);
                
                // 메시지 형식 정규화 (프론트엔드와 백엔드 호환성)
                const normalizedMessages = messagesToSave.map(msg => ({
                  id: msg.id,
                  role: msg.type === 'user' ? 'user' : 'assistant', // DynamoDB 저장용
                  type: msg.type, // 프론트엔드 호환성
                  content: msg.content,
                  timestamp: msg.timestamp || new Date().toISOString()
                }));
                
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                // conversationService.js와 동일한 순서로 userId 가져오기
                const userId = userInfo.username || userInfo.userId || userInfo.email || 'anonymous';  // UUID 우선
                
                const conversationData = {
                  conversationId: currentConversationId,
                  userId: userId,
                  engineType: message.engine || selectedEngine,
                  messages: normalizedMessages,
                  title: messagesToSave[0]?.content?.substring(0, 50) || "New Conversation",
                };

                console.log("💾 AI 응답 완료, 전체 대화 저장:", {
                  conversationId: currentConversationId,
                  userId: userId,
                  engineType: conversationData.engineType,
                  messageCount: normalizedMessages.length,
                  messages: normalizedMessages.map(m => ({
                    role: m.role,
                    preview: m.content.substring(0, 30) + '...'
                  }))
                });

                import("../services/conversationService").then(
                  ({ saveConversation }) => {
                    saveConversation(conversationData)
                      .then((result) => {
                        console.log("✅ 대화 저장 성공:", result);
                        // 사이드바 새로고침
                        window.dispatchEvent(new CustomEvent("refreshSidebar"));
                        if (onNewConversation) {
                          onNewConversation();
                        }
                      })
                      .catch((error) =>
                        console.error("❌ 대화 저장 실패:", error)
                      );
                  }
                );
              }

              return updated;
            });
            // 🔑 중요: 사용량 업데이트 후에 초기화하도록 순서 변경
            // currentAssistantMessageId.current = null;
            // setStreamingContent("");
            // streamingContentRef.current = ""; // ref 초기화를 나중에
            // expectedChunkIndex.current = 0;
            // chunkBuffer.current.clear();
          }
          setIsLoading(false);
          console.log(
            `✅ 응답 완료: ${message.total_chunks} 청크, ${message.response_length} 문자`
          );

          // 사용량 업데이트 (비동기) - ref를 사용하여 마지막 사용자 메시지 참조
          const updateUsage = async () => {
            console.log("🔍 사용량 업데이트 함수 호출됨");

            // 사용자 메시지가 없으면 빈 메시지로 처리 (기본 인사말 등)
            const lastUserMsg = lastUserMessageRef.current || {
              type: "user",
              content: "", // 빈 메시지로 처리
              timestamp: new Date(),
            };

            // 🔑 핵심 수정: ref에서 최신 AI 메시지 가져오기
            const lastAiMsg = lastAiMessageRef.current || {
              type: "assistant",
              content: streamingContentRef.current || streamingContent || "",
              timestamp: new Date(),
            };

            console.log("📝 메시지 확인:", {
              lastUserMsg,
              lastAiMsg,
              totalMessages: messages.length,
              streamingContentRefLength: streamingContentRef.current?.length,
              streamingContentLength: streamingContent?.length,
              refContent: streamingContentRef.current?.substring(0, 100),
              allMessages: messages,
            });

            if (lastAiMsg) {
              // AI 메시지만 있으면 업데이트
              try {
                const result = await updateLocalUsage(
                  selectedEngine,
                  lastUserMsg.content,
                  lastAiMsg.content
                );

                if (result && result.success) {
                  setUsagePercentage(result.percentage);
                  console.log(
                    `📊 ${selectedEngine} 사용량 업데이트: ${result.percentage}%`
                  );

                  if (result.isBackup) {
                    console.log("💾 로컬 백업 모드로 저장됨");
                  }

                  // 대시보드에 사용량 업데이트 알림
                  window.dispatchEvent(new CustomEvent("usageUpdated"));
                } else {
                  console.warn(
                    `⚠️ 사용량 업데이트 실패: ${
                      result?.reason || "알 수 없는 오류"
                    }`
                  );
                }
              } catch (error) {
                console.error("사용량 업데이트 중 오류:", error);
              }
            } else {
              console.log("⚠️ 메시지가 없어서 사용량 업데이트 스킵");
            }
          };

          // 🔑 사용량 업데이트 완료 후 상태 초기화
          updateUsage().finally(() => {
            // 사용량 업데이트가 완료된 후 스트리밍 상태 초기화
            currentAssistantMessageId.current = null;
            setStreamingContent("");
            streamingContentRef.current = ""; // 🔑 이제 안전하게 초기화
            expectedChunkIndex.current = 0;
            chunkBuffer.current.clear();
            console.log("🧹 스트리밍 상태 완전 초기화 완료");
          });
          break;

        case "chat_error":
        case "error":
          console.error("❌ WebSocket 오류:", message.message);
          setError(message.message || "오류가 발생했습니다");
          setIsLoading(false);

          // 모든 타임아웃 클리어
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
          }
          if (processBufferTimeoutRef.current) {
            clearTimeout(processBufferTimeoutRef.current);
            processBufferTimeoutRef.current = null;
          }

          // 오류 시에도 스트리밍 상태 완전 초기화
          currentAssistantMessageId.current = null;
          setStreamingContent("");
          streamingContentRef.current = ""; // 🔑 ref도 초기화
          expectedChunkIndex.current = 0;
          chunkBuffer.current.clear();
          break;
      }
    };

    // WebSocket 메시지 핸들러 등록
    addMessageHandler(handleWebSocketMessage);

    // WebSocket 연결 및 초기 메시지 처리
    const initWebSocket = async () => {
      try {
        if (!isWebSocketConnected()) {
          console.log("WebSocket 연결 시도...");
          await connectWebSocket();
          setIsConnected(true);
          console.log("WebSocket 연결 성공!");

          // 새 연결 시 스트리밍 상태 완전 초기화
          setStreamingContent("");
          streamingContentRef.current = ""; // 🔑 ref도 초기화
          currentAssistantMessageId.current = null;
          expectedChunkIndex.current = 0;
          setIsLoading(false);
        } else {
          setIsConnected(true);
        }

        // initialMessage가 있고, 새로 시작하는 대화인 경우에만 자동 전송
        // localStorage에서 pendingMessage가 있었거나 location.state에 initialMessage가 있는 경우
        const isFromMainPage = !!(location.state?.initialMessage || initialMessage);
        
        // sessionStorage를 사용하여 이미 처리된 메시지 추적
        const processedKey = `processed_${currentConversationId}`;
        const alreadyProcessed = sessionStorage.getItem(processedKey) === 'true';
        
        // messages가 비어있거나 사용자 메시지만 1개 있는 경우에만 전송
        const hasOnlyInitialUserMessage = messages.length === 1 && messages[0]?.type === 'user';
        const shouldSendInitial = initialMessage && !hasProcessedInitial.current && isFromMainPage && !alreadyProcessed && hasOnlyInitialUserMessage;
        
        console.log("🔍 초기 메시지 전송 여부 확인:", {
          initialMessage: !!initialMessage,
          hasProcessedInitial: hasProcessedInitial.current,
          isFromMainPage,
          alreadyProcessed,
          shouldSendInitial,
          urlConversationId,
          locationState: location.state
        });
        
        if (shouldSendInitial) {
          hasProcessedInitial.current = true;
          // sessionStorage에 처리 완료 표시
          sessionStorage.setItem(processedKey, 'true');
          console.log(
            "📝 Initial message 감지 및 자동 전송 시작:",
            initialMessage
          );

          // WebSocket 연결 상태를 확인하고 안정적으로 메시지 전송
          const sendInitialMessage = async (retryCount = 0) => {
            const maxRetries = 3;
            const retryDelay = 1000; // 1초
            
            try {
              // WebSocket 연결 상태 확인 - 더 빠르게 재시도
              const wsConnected = isWebSocketConnected();
              if (!wsConnected) {
                console.log(`⏳ WebSocket 연결 대기 중... (시도 ${retryCount + 1}/${maxRetries})`);
                
                if (retryCount < maxRetries) {
                  // 더 빠른 재시도
                  setTimeout(() => sendInitialMessage(retryCount + 1), 300); // 300ms로 단축
                  return;
                } else {
                  console.warn("⚠️ WebSocket 연결이 느립니다. 그래도 메시지 전송 시도...");
                  // 연결이 안 되어도 시도해보기
                }
              }
              
              console.log("✅ WebSocket 연결 확인됨, 메시지 전송 시작");
              
              // 🔑 개선된 중복 체크: 현재 messages 상태에서 동일한 내용의 사용자 메시지 확인
              let userMessage = null;
              const userMessageRef = { current: null };
              
              setMessages((currentMessages) => {
                const existingUserMessage = currentMessages.find(m => 
                  m.type === 'user' && m.content === initialMessage
                );
                
                if (existingUserMessage) {
                  userMessageRef.current = existingUserMessage;
                  console.log("✅ 기존 사용자 메시지 사용:", existingUserMessage);
                  return currentMessages; // 변경 없이 현재 상태 유지
                } else {
                  // 사용자 메시지가 없는 경우에만 추가
                  const idempotencyKey = crypto.randomUUID();
                  const newUserMessage = {
                    id: crypto.randomUUID(),
                    type: "user",
                    content: initialMessage,
                    timestamp: new Date(),
                    idempotencyKey,
                  };
                  userMessageRef.current = newUserMessage;
                  console.log("➕ 새 사용자 메시지 추가:", newUserMessage);
                  return [...currentMessages, newUserMessage];
                }
              });
              
              // ref에서 실제 사용자 메시지 참조 가져오기
              userMessage = userMessageRef.current;
              lastUserMessageRef.current = userMessage;

              // 스트리밍 상태 초기화 (AI 메시지는 ai_start에서 생성됨)
              streamingContentRef.current = "";
              setStreamingContent("");
              expectedChunkIndex.current = 0;
              chunkBuffer.current.clear();
              currentAssistantMessageId.current = null; // 명시적으로 null로 설정
              setIsLoading(false); // ai_start에서 true로 설정될 것임
              
              console.log("✅ 초기 메시지 전송 준비 완료 - AI 응답 대기 중");

              // WebSocket으로 메시지 전송 (재시도 로직 포함)
              let sendSuccess = false;
              let sendRetries = 0;
              
              while (!sendSuccess && sendRetries < 3) {
                try {
                  await sendChatMessage(
                    initialMessage,
                    selectedEngine,
                    [],
                    currentConversationId,
                    userMessage?.idempotencyKey || crypto.randomUUID()
                  );
                  sendSuccess = true;
                  console.log("✅ Initial message 전송 완료");
                } catch (sendError) {
                  sendRetries++;
                  console.log(`⚠️ 메시지 전송 실패 (시도 ${sendRetries}/3):`, sendError);
                  
                  if (sendRetries < 3) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } else {
                    throw sendError;
                  }
                }
              }
              
              // AI 응답 완료 후에만 저장하도록 변경 (중복 방지)
              // 초기 메시지만으로는 저장하지 않음
              console.log("📝 대화 저장은 AI 응답 완료 후에 진행됩니다");
            } catch (error) {
              console.error("❌ Initial message 전송 실패:", error);
              setIsLoading(false);
              setError("메시지 전송에 실패했습니다. 새로고침 후 다시 시도해주세요.");
              
              // 실패 시 처리 플래그 리셋 (재시도 가능하도록)
              hasProcessedInitial.current = false;
              const processedKey = `processed_${currentConversationId}`;
              sessionStorage.removeItem(processedKey);
            }
          };
          
          // 짧은 지연 후 메시지 전송 (WebSocket 연결 안정화를 위해)
          setTimeout(() => sendInitialMessage(0), 500);
        }
      } catch (error) {
        console.error("WebSocket 연결 실패:", error);
        setIsConnected(false);
      }
    };

    initWebSocket();

    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log("ChatPage 언마운트 - 핸들러 및 상태 정리");
      
      // sessionStorage 정리 (새로고침 시 초기화)
      const processedKey = `processed_${currentConversationId}`;
      sessionStorage.removeItem(processedKey);

      // WebSocket 메시지 핸들러 제거
      removeMessageHandler(handleWebSocketMessage);

      // 모든 타임아웃 클리어
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
      if (processBufferTimeoutRef.current) {
        clearTimeout(processBufferTimeoutRef.current);
        processBufferTimeoutRef.current = null;
      }

      // 스트리밍 상태 완전 정리
      setStreamingContent("");
      streamingContentRef.current = ""; // 🔑 ref도 초기화
      currentAssistantMessageId.current = null;
      expectedChunkIndex.current = 0;
      chunkBuffer.current.clear();
      setIsLoading(false);
    };
  }, []); // 빈 dependency 배열로 한 번만 실행

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    const id = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID(); // 중복 방지용 키
    const userMessage = {
      id, // 문자열 ID
      type: "user",
      content: currentMessage.trim(),
      timestamp: new Date(),
      idempotencyKey, // 중복 방지 키 추가
    };

    setMessages((prev) => [...prev, userMessage]);
    lastUserMessageRef.current = userMessage; // 마지막 사용자 메시지 저장
    setCurrentMessage("");
    setIsTyping(false);
    setIsLoading(true);
    setError(null);

    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // AI 응답 완료 후에만 저장하도록 변경 (중복 방지)
    // 첫 메시지 즉시 저장 로직 제거
    if (messages.length === 0 || (messages.length === 1 && messages[0].type === 'user')) {
      console.log("📝 첫 메시지 전송 - AI 응답 완료 후 쓰레드에 추가됩니다");
    }

    try {
      // WebSocket으로 메시지 전송
      if (isConnected) {
        // 대화 히스토리 생성 - 완료된 메시지만 포함
        const conversationHistory = messages
          .filter((msg) => !msg.isStreaming && msg.content) // 스트리밍 중이 아니고 내용이 있는 메시지만
          .map((msg) => ({
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
          }));

        console.log("대화 컨텍스트 생성:", {
          totalMessages: messages.length,
          historyLength: conversationHistory.length,
          recentHistory: conversationHistory.slice(-4).map((msg) => ({
            role: msg.type,
            preview: msg.content.substring(0, 50) + "...",
          })),
        });

        console.log(
          `${selectedEngine} 엔진으로 메시지 전송:`,
          userMessage.content
        );

        // WebSocket으로 메시지 전송 시에도 ref 업데이트
        lastUserMessageRef.current = userMessage;

        await sendChatMessage(
          userMessage.content,
          selectedEngine,
          conversationHistory,
          currentConversationId,
          userMessage.idempotencyKey
        );

        // WebSocket 응답은 메시지 핸들러에서 처리됨
        // 스크롤은 메시지가 추가될 때 자동으로 처리
      } else {
        // WebSocket 연결이 안된 경우 재연결 시도
        console.warn("WebSocket이 연결되지 않았습니다. 재연결 시도 중...");
        await connectWebSocket();
        setIsConnected(true);

        // 재연결 후 메시지 전송 (대화 히스토리 포함)
        const conversationHistory = messages
          .filter((msg) => !msg.isStreaming && msg.content)
          .map((msg) => ({
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
          }));

        await sendChatMessage(
          userMessage.content,
          selectedEngine,
          conversationHistory,
          currentConversationId,
          userMessage.idempotencyKey
        );
      }
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      setError(err.message || "메시지 전송 중 오류가 발생했습니다.");
      setIsLoading(false);

      const errorMessage = {
        id: crypto.randomUUID(),
        type: "assistant",
        content: `죄송합니다. 메시지 전송 중 오류가 발생했습니다: ${err.message}`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);

    // 자동 크기 조절
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // 메시지가 추가될 때마다 최근 사용자 메시지를 상단에 위치 & 자동 저장
  useEffect(() => {
    // 스트리밍 중이거나 비어있는 메시지는 저장하지 않음
    const hasStreamingMessage = messages.some((msg) => msg.isStreaming);
    const completedMessages = messages.filter(
      (msg) => !msg.isStreaming && msg.content
    );

    if (completedMessages.length > 0 && !hasStreamingMessage) {
      // localStorage에 대화 저장 (최대 50개 메시지만 유지)
      const conversationKey = `chat_history_${selectedEngine}`;
      const messagesToSave = completedMessages.slice(-50); // 최근 50개만 저장
      localStorage.setItem(conversationKey, JSON.stringify(messagesToSave));
      console.log(
        "localStorage에 대화 저장:",
        messagesToSave.length,
        "개 메시지"
      );

      // 서버에 자동 저장 (DynamoDB) - assistant 메시지가 있을 때만
      const hasAssistantMessage = completedMessages.some(
        (msg) => msg.type === "assistant"
      );

      if (hasAssistantMessage) {
        const conversationData = {
          conversationId: currentConversationId,
          engineType: selectedEngine,
          messages: messagesToSave,
          title:
            messagesToSave[0]?.content?.substring(0, 50) || "New Conversation",
        };
        autoSaveConversation(conversationData);
      }
    }
  }, [
    messages.filter((m) => !m.isStreaming).length,
    selectedEngine,
    currentConversationId,
  ]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        onLogout={onLogout}
        onHome={onBackToLanding}
        onToggleSidebar={onToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onDashboard={onDashboard}
        selectedEngine={selectedEngine}
        usagePercentage={usagePercentage}
      />

      {/* Main Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Container with scroll */}
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div
            className={clsx(
              "mx-auto px-4 pt-6 pb-4",
              userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
            )}
          >
            {/* Loading Spinner */}
            {isLoadingConversation && (
              <div className="flex justify-center items-center py-12">
                <span className="animate-pulse">\ub85c\ub4dc \uc911...</span>
              </div>
            )}

            {/* Messages */}
            {!isLoadingConversation && (
              <>
                {messages.map((message) => {
                  return (
                    <div
                      key={message.id}
                      data-test-render-count="8"
                      data-message-type={message.type}
                    >
                      {message.type === "user" ? (
                        <UserMessage message={message} />
                      ) : message.isStreaming ? (
                        <StreamingAssistantMessage
                          content={message.content}
                          isStreaming={message.isStreaming}
                          timestamp={message.timestamp}
                          messageId={message.id}
                        />
                      ) : (
                        <AssistantMessage
                          content={message.content}
                          timestamp={message.timestamp}
                          messageId={message.id}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* 스크롤 타겟 */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Field - Fixed at bottom */}
        <div className={clsx(
          "mx-auto w-full py-4",
          userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
        )}>

          <fieldset className="flex w-full min-w-0 flex-col px-4">
            <div
              className="!box-content flex flex-col items-stretch transition-all duration-200 relative cursor-text z-10 rounded-2xl border border-border-300/15"
              style={{
                backgroundColor: "hsl(var(--bg-000))",
                boxShadow: "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)";
              }}
            >
              <div className="flex flex-col gap-3.5 m-3.5">
                <div className="relative">
                  <div className="max-h-96 w-full overflow-y-auto font-large break-words transition-opacity duration-200 min-h-[1.5rem]">
                    <textarea
                      ref={textareaRef}
                      value={currentMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Claude에게 답변하기"
                      className="w-full min-h-[1.5rem] max-h-96 resize-none bg-transparent border-none outline-none text-text-100 placeholder-text-500 font-large leading-relaxed"
                      rows={1}
                      style={{
                        fieldSizing: "content",
                        overflow: "hidden",
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 w-full items-center">
                  <div className="relative flex-1 flex items-center gap-2 shrink min-w-0">
                    <div className="relative shrink-0">
                      <div className="flex items-center">
                        <button 
                          className="claude-button group"
                          onClick={() => {
                            // 현재 대화의 캐시만 삭제 (다른 대화는 유지)
                            if (currentConversationId) {
                              const cacheKey = `conv:${currentConversationId}`;
                              localStorage.removeItem(cacheKey);
                              console.log(`🗑️ 현재 대화 캐시 삭제: ${cacheKey}`);
                            }
                            
                            // 임시 데이터 정리
                            localStorage.removeItem('pendingMessage');
                            localStorage.removeItem('pendingConversationId');
                            
                            // sessionStorage 정리 (모든 processed 키 제거)
                            Object.keys(sessionStorage).forEach(key => {
                              if (key.startsWith('processed_')) {
                                sessionStorage.removeItem(key);
                              }
                            });
                            
                            console.log("🔄 새 채팅 시작 - 이전 대화 기록 정리 완료");
                            
                            // 메인 페이지로 이동
                            window.location.href = `/${selectedEngine.toLowerCase()}`;
                          }}
                          title="새 채팅"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <div className="flex items-center">
                        <button className="claude-button group">
                          <Settings size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <div style={{ opacity: 1, transform: "none" }}>
                    <button
                      className={clsx(
                        "inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold transition-colors h-8 w-8 rounded-md active:scale-95 !rounded-lg !h-8 !w-8",
                        isTyping
                          ? "bg-accent-main-000 text-oncolor-100 hover:bg-accent-main-200"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      )}
                      disabled={!isTyping}
                      type="button"
                      onClick={handleSendMessage}
                      aria-label="메시지 보내기"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

const UserMessage = ({ message }) => {
  console.log("🔍 UserMessage 렌더링:", {
    id: message.id,
    content: message.content,
    contentLength: message.content?.length,
    type: message.type
  });
  
  return (
    <div className="mb-1 mt-1">
      <div
        className="group relative inline-flex gap-2 rounded-xl pl-2.5 py-2.5 break-words text-text-100 transition-all max-w-[75ch] flex-col pr-6"
        style={{
          opacity: 1,
          transform: "none",
          backgroundColor: "hsl(var(--bg-300))",
        }}
      >
        <div className="flex flex-row gap-2">
          <div className="shrink-0">
            <div
              className="flex shrink-0 items-center justify-center rounded-full font-bold select-none h-7 w-7 text-[12px] text-oncolor-100"
              style={{ backgroundColor: "hsl(var(--accent-pro-100))" }}
            >
              WI
            </div>
          </div>
          <div
            data-testid="user-message"
            className="grid grid-cols-1 gap-2 py-0.5"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.9375rem",
              lineHeight: "1.5rem",
              letterSpacing: "-0.025em",
              color: "hsl(var(--text-100))",
            }}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
