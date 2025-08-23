import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowUp, Plus, Settings, Search } from "lucide-react";
import Header from "./Header";
import clsx from "clsx";
import { generateTitles, generateTitlesMock } from "../services/api";
import {
  connectWebSocket,
  sendChatMessage,
  addMessageHandler,
  removeMessageHandler,
  isWebSocketConnected,
} from "../services/websocketService";
import { autoSaveConversation, getConversation } from "../services/conversationService";
import { useParams } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import StreamingAssistantMessage from "./StreamingAssistantMessage";
import AssistantMessage from "./AssistantMessage";

const ChatPage = ({
  initialMessage,
  userRole,
  selectedEngine = "T5",
  onLogout,
  onBackToLanding,
  onToggleSidebar,
  isSidebarOpen = false,
  onNewConversation
}) => {
  const { conversationId } = useParams();
  const [currentConversationId, setCurrentConversationId] = useState(
    conversationId || `${selectedEngine}_${Date.now()}`
  );
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [messages, setMessages] = useState(() => {
    console.log("🎯 ChatPage 초기화 - initialMessage:", initialMessage);
    
    // localStorage에서 대화 히스토리 복원 시도
    const conversationKey = `chat_history_${selectedEngine}`;
    const savedMessages = localStorage.getItem(conversationKey);
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        console.log("📦 localStorage에서 대화 복원:", parsedMessages.length, "개 메시지");
        // timestamp를 Date 객체로 변환
        return parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error("대화 복원 실패:", error);
      }
    }
    
    if (initialMessage) {
      const initialUserMessage = {
        id: 1,
        type: "user",
        content: initialMessage,
        timestamp: new Date(),
      };
      console.log("📝 초기 사용자 메시지 생성:", initialUserMessage);
      return [initialUserMessage];
    }
    return [];
  });
  
  // 기존 대화 불러오기
  useEffect(() => {
    if (conversationId) {
      setIsLoadingConversation(true);
      setCurrentConversationId(conversationId);
      getConversation(conversationId).then(conversation => {
        if (conversation && conversation.messages) {
          console.log("📥 서버에서 대화 복원:", conversation.messages.length, "개 메시지");
          setMessages(conversation.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      }).catch(error => {
        console.error("서버에서 대화 불러오기 실패:", error);
      }).finally(() => {
        setIsLoadingConversation(false);
      });
    } else {
      // 새 대화인 경우
      const newConversationId = `${selectedEngine}_${Date.now()}`;
      setCurrentConversationId(newConversationId);
      setMessages([]);
    }
  }, [conversationId, selectedEngine]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const currentAssistantMessageId = useRef(null);
  const hasProcessedInitial = useRef(false);
  const expectedChunkIndex = useRef(0); // 청크 순서 추적
  const streamingTimeoutRef = useRef(null); // 스트리밍 타임아웃 추적
  const chunkBuffer = useRef(new Map()); // 청크 버퍼 (index -> chunk 내용)
  const processBufferTimeoutRef = useRef(null); // 버퍼 처리 타임아웃

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

      console.log(
        `🔄 버퍼에서 ${processedChunks.length}개 청크 처리: "${combinedText}" (길이: ${combinedText.length})`
      );

      // 스트리밍 content 누적
      setStreamingContent((prev) => {
        const newContent = prev + combinedText;
        console.log(`📈 누적 길이: ${prev.length} → ${newContent.length}`);

        // 메시지 업데이트
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === currentAssistantMessageId.current
              ? { ...msg, content: newContent }
              : msg
          )
        );

        return newContent;
      });
    }

    // 버퍼에 남은 청크가 있으면 다시 타임아웃 설정 (더 부드러운 타이핑을 위해 80ms로 조정)
    if (buffer.size > 0) {
      processBufferTimeoutRef.current = setTimeout(processChunkBuffer, 50);
    }
  };

  // WebSocket 초기화 및 메시지 핸들러 설정
  useEffect(() => {
    // 컴포넌트 마운트 시 모든 스트리밍 상태 완전 초기화
    console.log("🔄 ChatPage 초기화 - 모든 스트리밍 상태 리셋", {
      initialMessage,
      selectedEngine,
      timestamp: new Date().toISOString()
    });
    setStreamingContent("");
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
            previousStreamingContent: streamingContent
          });

          // 이전 스트리밍 상태 완전히 정리
          setStreamingContent("");
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
            bufferCleared: true
          });

          // 스트리밍 타임아웃 설정 (30초)
          streamingTimeoutRef.current = setTimeout(() => {
            console.warn("⚠️ 스트리밍 타임아웃! 강제 종료");
            setIsLoading(false);
            setError("응답 시간이 초과되었습니다. 다시 시도해주세요.");
            currentAssistantMessageId.current = null;
            setStreamingContent("");
            expectedChunkIndex.current = 0;
          }, 30000);

          setMessages((prev) => [
            ...prev,
            {
              id: newMessageId,
              type: "assistant",
              content: "",
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
          break;

        case "ai_chunk":
          // 스트리밍 청크 수신 - 간단하게 순차 처리
          if (message.chunk && currentAssistantMessageId.current) {
            const chunkText = message.chunk;
            const receivedIndex = message.chunk_index || 0;

            // 현재 기대하는 인덱스와 일치하면 바로 처리
            if (receivedIndex === expectedChunkIndex.current) {
              console.log(`✅ 청크 ${receivedIndex} 즉시 처리:`, {
                text: chunkText,
                length: chunkText.length,
                currentTotal: streamingContent.length
              });
              
              // 스트리밍 콘텐츠 업데이트
              setStreamingContent((prev) => {
                const newContent = prev + chunkText;
                console.log(`📊 스트리밍 진행:`, {
                  prevLength: prev.length,
                  addedLength: chunkText.length,
                  newLength: newContent.length,
                  preview: newContent.substring(0, 50)
                });
                
                // 메시지 업데이트
                setMessages((prevMessages) =>
                  prevMessages.map((msg) =>
                    msg.id === currentAssistantMessageId.current
                      ? { ...msg, content: newContent }
                      : msg
                  )
                );
                
                return newContent;
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
                bufferSize: chunkBuffer.current.size + 1
              });
              chunkBuffer.current.set(receivedIndex, chunkText);
            }
          }
          break;

        case "chat_end":
          // 스트리밍 종료
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

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentAssistantMessageId.current
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            currentAssistantMessageId.current = null;
            setStreamingContent("");
            expectedChunkIndex.current = 0; // 청크 인덱스 리셋
            chunkBuffer.current.clear(); // 버퍼 클리어
          }
          setIsLoading(false);
          console.log(
            `✅ 응답 완료: ${message.total_chunks} 청크, ${message.response_length} 문자`
          );
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
          currentAssistantMessageId.current = null;
          expectedChunkIndex.current = 0;
          setIsLoading(false);
        } else {
          setIsConnected(true);
        }

        // initialMessage가 있고 아직 처리하지 않았다면 자동으로 전송
        if (initialMessage && !hasProcessedInitial.current) {
          hasProcessedInitial.current = true;
          console.log("🚀 Initial message 자동 전송 준비:", {
            message: initialMessage,
            engine: selectedEngine,
            connected: isWebSocketConnected(),
            timestamp: new Date().toISOString()
          });

          // 핸들러 등록 완료를 위한 지연
          setTimeout(async () => {
            console.log("📤 초기 메시지 전송 시작:", {
              message: initialMessage,
              length: initialMessage.length,
              engine: selectedEngine
            });
            setIsLoading(true);
            try {
              // 초기 메시지는 대화 히스토리 없이 전송
          await sendChatMessage(initialMessage, selectedEngine, [], currentConversationId);
              console.log("✅ 초기 메시지 전송 완료");
            } catch (error) {
              console.error("❌ Initial message 전송 실패:", error);
              setIsLoading(false);
              setError("초기 메시지 전송에 실패했습니다.");
            }
          }, 500); // 더 안전한 지연 시간
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
      currentAssistantMessageId.current = null;
      expectedChunkIndex.current = 0;
      chunkBuffer.current.clear();
      setIsLoading(false);
    };
  }, []); // 빈 dependency 배열로 한 번만 실행

  // ref 등록 함수
  const registerItemRef = (id) => (el) => {
    if (!el) {
      itemRefs.current.delete(id);
    } else {
      itemRefs.current.set(id, el);
    }
  };

  // 메시지를 화면 상단에 정밀하게 위치시키는 스크롤
  const HEADER_HEIGHT = 64; // Header 컴포넌트 높이 (h-16)
  const TOP_GAP = 20;       // 상단 여백
  
  const scrollMessageToTop = (id) => {
    const container = scrollContainerRef.current;
    const el = itemRefs.current.get(String(id));
    
    if (!container || !el) return;
    
    const containerRect = container.getBoundingClientRect();
    const messageRect = el.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;
    
    // 컨테이너 기준 상대 top에서 헤더/여백 보정
    const delta = (messageRect.top - containerRect.top) - TOP_GAP;
    
    container.scrollTo({ 
      top: currentScrollTop + delta, 
      behavior: 'smooth' 
    });
  };

  // 스트리밍 중 사용자 메시지 위치 유지 (ResizeObserver 사용)
  useEffect(() => {
    // 마지막 메시지가 사용자 메시지일 때만 관찰
    const lastUserMessage = messages.filter(m => m.type === 'user').slice(-1)[0];
    if (!lastUserMessage || !isLoading) return;
    
    const el = itemRefs.current.get(String(lastUserMessage.id));
    if (!el) return;
    
    // AI 응답이 길어져도 사용자 메시지를 상단에 유지
    const observer = new ResizeObserver(() => {
      scrollMessageToTop(String(lastUserMessage.id));
    });
    
    // 다음 AI 응답 메시지 관찰
    const aiMessages = document.querySelectorAll('[data-message-type="assistant"]');
    aiMessages.forEach(msg => observer.observe(msg));
    
    // 3초 후 자동 해제 (필요시 조정)
    const timeout = setTimeout(() => observer.disconnect(), 3000);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;
    
    const id = crypto.randomUUID();
    const userMessage = {
      id,  // 문자열 ID
      type: "user",
      content: currentMessage.trim(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setIsTyping(false);
    setIsLoading(true);
    setError(null);

    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    // 첫 메시지인 경우 즉시 저장하고 사이드바 업데이트
    if (messages.length === 1 || (messages.length === 0 && initialMessage)) {
      const conversationData = {
        conversationId: currentConversationId,
        engineType: selectedEngine,
        messages: [userMessage],
        title: userMessage.content.substring(0, 50)
      };
      
      // 즉시 저장 (디바운스 없이)
      import('../services/conversationService').then(({ saveConversation }) => {
        saveConversation(conversationData).then(() => {
          console.log('✅ 첫 메시지 저장 완료, 사이드바 업데이트');
          // 사이드바 업데이트 콜백 호출
          if (onNewConversation) {
            onNewConversation();
          }
        }).catch(error => {
          console.error('첫 메시지 저장 실패:', error);
        });
      });
    }
    
    // 렌더 완료 직후 1프레임에서 상단 정렬
    requestAnimationFrame(() => {
      scrollMessageToTop(id);
    });

    try {
        // WebSocket으로 메시지 전송
        if (isConnected) {
          // 대화 히스토리 생성 - 완료된 메시지만 포함
          const conversationHistory = messages
            .filter(msg => !msg.isStreaming && msg.content) // 스트리밍 중이 아니고 내용이 있는 메시지만
            .map(msg => ({
              type: msg.type,
              content: msg.content,
              timestamp: msg.timestamp
            }));

          console.log('🧠 대화 컨텍스트 생성:', {
            totalMessages: messages.length,
            historyLength: conversationHistory.length,
            recentHistory: conversationHistory.slice(-4).map(msg => ({
              role: msg.type,
              preview: msg.content.substring(0, 50) + '...'
            }))
          });

          console.log(
            `📤 ${selectedEngine} 엔진으로 메시지 전송:`,
            userMessage.content
          );
          
          await sendChatMessage(userMessage.content, selectedEngine, conversationHistory, currentConversationId);

          // WebSocket 응답은 메시지 핸들러에서 처리됨
          // 스크롤은 메시지가 추가될 때 자동으로 처리
        } else {
          // WebSocket 연결이 안된 경우 재연결 시도
          console.warn("WebSocket이 연결되지 않았습니다. 재연결 시도 중...");
          await connectWebSocket();
          setIsConnected(true);
          
          // 재연결 후 메시지 전송 (대화 히스토리 포함)
          const conversationHistory = messages
            .filter(msg => !msg.isStreaming && msg.content)
            .map(msg => ({
              type: msg.type,
              content: msg.content,
              timestamp: msg.timestamp
            }));
            
          await sendChatMessage(userMessage.content, selectedEngine, conversationHistory, currentConversationId);
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
    // localStorage에 대화 저장 (최대 50개 메시지만 유지)
    if (messages.length > 0) {
      const conversationKey = `chat_history_${selectedEngine}`;
      const messagesToSave = messages.slice(-50); // 최근 50개만 저장
      localStorage.setItem(conversationKey, JSON.stringify(messagesToSave));
      console.log("💾 localStorage에 대화 저장:", messagesToSave.length, "개 메시지");
      
      // 서버에 자동 저장 (DynamoDB)
      const conversationData = {
        conversationId: currentConversationId,
        engineType: selectedEngine,
        messages: messagesToSave,
        title: messagesToSave[0]?.content?.substring(0, 50) || 'New Conversation'
      };
      autoSaveConversation(conversationData);
    }
    
    // 새 사용자 메시지가 추가되었을 때만 스크롤
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.type === "user") {
      // requestAnimationFrame으로 렌더링 완료 후 스크롤
      requestAnimationFrame(() => {
        scrollMessageToTop(String(lastMessage.id));
      });
    }
  }, [messages, selectedEngine, currentConversationId]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        onLogout={onLogout}
        onHome={onBackToLanding}
        onToggleSidebar={onToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Container with scroll */}
        <div className="flex-1 overflow-y-auto pb-4" ref={scrollContainerRef}>
          <div
            className={clsx(
              "mx-auto px-4 pt-6",
              userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
            )}
          >
            {/* Loading Spinner */}
            {isLoadingConversation && (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            )}
            
            {/* Messages */}
            {!isLoadingConversation && messages.map((message) => (
              <div 
                key={message.id}
                ref={registerItemRef(String(message.id))}
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
            ))}

            {/* 스크롤 타겟 */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Bottom Input */}
        <div className="bg-bg-100">
          <div
            className={clsx(
              "mx-auto w-full py-4",
              userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
            )}
          >
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
                          <button className="claude-button group">
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

                      <div className="flex shrink min-w-8 !shrink-0">
                        <button className="claude-button group flex shrink min-w-8 !shrink-0">
                          <Search size={16} />
                          <p className="min-w-0 pl-1 text-xs tracking-tight text-ellipsis whitespace-nowrap break-words overflow-hidden shrink">
                            연구
                          </p>
                        </button>
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
    </div>
  );
};  


const UserMessage = ({ message }) => (
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

export default ChatPage;
