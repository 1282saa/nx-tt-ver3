import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Plus,
  Settings,
  Search,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Edit3,
  Loader2,
} from "lucide-react";
import Header from "./Header";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { generateTitles, generateTitlesMock } from "../services/api";
import {
  connectWebSocket,
  disconnectWebSocket,
  sendChatMessage,
  onWebSocketMessage,
  isWebSocketConnected,
} from "../services/websocketService";

const ChatPage = ({
  initialMessage,
  userRole,
  selectedEngine = "T5",
  onBack,
  onLogout,
  onBackToLanding,
}) => {
  const [messages, setMessages] = useState(() => {
    console.log("🎯 ChatPage 초기화 - initialMessage:", initialMessage);
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

    // 버퍼에 남은 청크가 있으면 다시 타임아웃 설정
    if (buffer.size > 0) {
      processBufferTimeoutRef.current = setTimeout(processChunkBuffer, 100);
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
    const unsubscribe = onWebSocketMessage((message) => {
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
              
              // 바로 스트리밍 content에 추가
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
    });

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
              await sendChatMessage(initialMessage, selectedEngine);
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
      unsubscribe();

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

  // 페이지 하단으로 스크롤하는 함수
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (currentMessage.trim() && !isLoading) {
      const userMessage = {
        id: messages.length + 1,
        type: "user",
        content: currentMessage.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setCurrentMessage("");
      setIsTyping(false);
      setIsLoading(true);
      setError(null);

      // 자동 크기 조절 리셋
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        // WebSocket으로 메시지 전송
        if (isConnected) {
          console.log(
            `📤 ${selectedEngine} 엔진으로 메시지 전송:`,
            userMessage.content
          );
          await sendChatMessage(userMessage.content, selectedEngine);

          // WebSocket 응답은 메시지 핸들러에서 처리됨
          // 스크롤은 메시지가 추가될 때 자동으로 처리
        } else {
          // WebSocket 연결이 안된 경우 재연결 시도
          console.warn("WebSocket이 연결되지 않았습니다. 재연결 시도 중...");
          await connectWebSocket();
          setIsConnected(true);
          // 재연결 후 메시지 전송
          await sendChatMessage(userMessage.content, selectedEngine);
        }
      } catch (err) {
        console.error("메시지 전송 오류:", err);
        setError(err.message || "메시지 전송 중 오류가 발생했습니다.");
        setIsLoading(false);

        const errorMessage = {
          id: messages.length + 2,
          type: "assistant",
          content: `죄송합니다. 메시지 전송 중 오류가 발생했습니다: ${err.message}`,
          timestamp: new Date(),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        // 메시지 전송 후 하단으로 스크롤
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
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

  // 메시지가 추가될 때마다 하단으로 스크롤
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        showBackButton={true}
        onBack={onBack}
        onLogout={onLogout}
        onHome={onBackToLanding}
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
            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} data-test-render-count="8">
                {message.type === "user" ? (
                  <UserMessage message={message} />
                ) : (
                  <AssistantMessage message={message} />
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

const AssistantMessage = ({ message }) => {
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  const handleCopyTitle = (title, index) => {
    navigator.clipboard.writeText(title);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Format message content for display
  const formatContent = () => {
    if (message.titles) {
      return (
        <>
          <div className="whitespace-normal break-words">
            안녕하세요! 기사 제목을 생성했습니다.
          </div>
          <div className="whitespace-normal break-words">
            아래 {message.titles.length}개의 제목 중에서 가장 적합한 것을
            선택하시거나, 수정하여 사용하실 수 있습니다:
          </div>
          <ol className="list-decimal space-y-2 pl-7">
            {message.titles.map((title, index) => (
              <li
                key={index}
                className="whitespace-normal break-words group/item relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1">{title}</span>
                  <button
                    onClick={() => handleCopyTitle(title, index)}
                    className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 p-1 hover:bg-bg-300 rounded-md shrink-0 ml-2"
                    title="복사"
                  >
                    {copiedIndex === index ? (
                      <span className="text-xs text-accent-main-100">✓</span>
                    ) : (
                      <Copy size={14} className="text-text-400" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="whitespace-normal break-words">
            추가로 다른 스타일의 제목이 필요하시거나, 특정 톤앤매너로 수정을
            원하시면 말씀해 주세요.
          </div>
        </>
      );
    } else if (message.isError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 whitespace-normal break-words">
            {message.content}
          </div>
        </div>
      );
    } else {
      // 마크다운 렌더링 적용
      return (
        <div className="chatbot-markdown prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks, remarkMath, remarkEmoji]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => (
                <p className="mb-4 leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-text-100">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-border-200">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold mb-3 mt-5 pb-1 border-b border-border-300">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-bold mb-2 mt-4 text-accent-main-100">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children, ordered, index, ...props }) => {
                // 체크리스트 지원
                const text = children && children[0];
                if (typeof text === "string") {
                  const checkMatch = text.match(/^\[([x ])\] (.*)$/);
                  if (checkMatch) {
                    const checked = checkMatch[1] === "x";
                    const content = checkMatch[2];
                    return (
                      <li
                        className="flex items-start gap-2 list-none -ml-6"
                        {...props}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="mt-1 cursor-not-allowed"
                        />
                        <span
                          className={checked ? "line-through opacity-70" : ""}
                        >
                          {content}
                        </span>
                      </li>
                    );
                  }
                }
                return (
                  <li className="leading-relaxed" {...props}>
                    {children}
                  </li>
                );
              },
              code: ({ inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");

                if (!inline && match) {
                  return (
                    <div className="relative group mb-4">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(codeString);
                          const btn = event.target;
                          btn.textContent = "✓ 복사됨";
                          setTimeout(() => (btn.textContent = "복사"), 2000);
                        }}
                        className="absolute right-2 top-2 px-2 py-1 text-xs bg-bg-300 hover:bg-bg-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        복사
                      </button>
                      <SyntaxHighlighter
                        language={match[1]}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return inline ? (
                  <code
                    className="px-1.5 py-0.5 bg-bg-300 text-accent-main-100 rounded text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="block p-4 bg-bg-200 rounded-lg overflow-x-auto text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <div className="mb-4">{children}</div>,
              blockquote: ({ children }) => {
                // 알림 박스 지원 (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT])
                const text =
                  children &&
                  children[0] &&
                  children[0].props &&
                  children[0].props.children;
                if (typeof text === "string") {
                  const alertMatch = text.match(
                    /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/
                  );
                  if (alertMatch) {
                    const type = alertMatch[1].toLowerCase();
                    const content = text.replace(
                      /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/,
                      ""
                    );
                    const styles = {
                      note: "bg-blue-900/20 border-blue-500 text-blue-200",
                      tip: "bg-green-900/20 border-green-500 text-green-200",
                      warning:
                        "bg-yellow-900/20 border-yellow-500 text-yellow-200",
                      important:
                        "bg-purple-900/20 border-purple-500 text-purple-200",
                      caution: "bg-red-900/20 border-red-500 text-red-200",
                    };
                    const icons = {
                      note: "📝",
                      tip: "💡",
                      warning: "⚠️",
                      important: "❗",
                      caution: "🚨",
                    };
                    return (
                      <div
                        className={`border-l-4 p-4 my-4 rounded-r ${styles[type]}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{icons[type]}</span>
                          <div>
                            <div className="font-bold mb-1 uppercase">
                              {type}
                            </div>
                            <div>{content}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }
                return (
                  <blockquote className="border-l-4 border-border-300 pl-4 italic my-4">
                    {children}
                  </blockquote>
                );
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-accent-main-000 underline hover:text-accent-main-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-6 border-border-300" />,
              table: ({ children }) => (
                <div className="chatbot-table-wrapper my-4">
                  <table className="w-full">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-bg-200">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left font-semibold border-b-2 border-border-300">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 border-b border-border-400">
                  {children}
                </td>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="hover:bg-bg-100 transition-colors">
                  {children}
                </tr>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
  };

  return (
    <>
      <div data-test-render-count="1" className="mb-1 mt-1">
        <div style={{ height: "auto", opacity: 1, transform: "none" }}>
          <div className="group relative pb-3">
            <div
              className="relative pl-2.5 pr-2"
              style={{
                fontFamily: "var(--font-claude-response)",
                fontSize: "0.9375rem",
                lineHeight: "1.65rem",
                letterSpacing: "-0.015em",
                color: "hsl(var(--text-100))",
                wordBreak: "break-words",
              }}
            >
              <div>
                <div className="grid-cols-1 grid gap-2.5">
                  {formatContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
