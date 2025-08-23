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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { generateTitles, generateTitlesMock } from "../services/api";
import { 
  connectWebSocket, 
  disconnectWebSocket, 
  sendChatMessage, 
  onWebSocketMessage, 
  isWebSocketConnected 
} from "../services/websocketService";

const ChatPage = ({
  initialMessage,
  userRole,
  selectedEngine = "T5",
  onBack,
  onLogout,
  onBackToLanding,
}) => {
  const [messages, setMessages] = useState(
    initialMessage
      ? [
          {
            id: 1,
            type: "user",
            content: initialMessage,
            timestamp: new Date(),
          },
        ]
      : []
  );
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

  // WebSocket 초기화 및 메시지 핸들러 설정
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        if (!isWebSocketConnected()) {
          console.log("WebSocket 연결 시도...");
          await connectWebSocket();
          setIsConnected(true);
          console.log("WebSocket 연결 성공!");
        } else {
          setIsConnected(true);
        }
      } catch (error) {
        console.error("WebSocket 연결 실패:", error);
        setIsConnected(false);
      }
    };

    initWebSocket();

    // WebSocket 메시지 핸들러 등록
    const unsubscribe = onWebSocketMessage((message) => {
      console.log("📨 WebSocket 메시지 수신:", message.type);
      
      switch (message.type) {
        case 'chat_start':
          console.log(`${message.engine} 엔진 시작:`, message.message);
          break;
          
        case 'data_loaded':
          console.log(`데이터 로드 완료: ${message.file_count}개 파일`);
          break;
          
        case 'ai_start':
          // AI 응답 시작 - 새 메시지 생성
          const newMessageId = Date.now();
          currentAssistantMessageId.current = newMessageId;
          setStreamingContent("");
          
          setMessages(prev => [...prev, {
            id: newMessageId,
            type: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true
          }]);
          break;
          
        case 'ai_chunk':
          // 스트리밍 청크 수신
          if (message.chunk && currentAssistantMessageId.current) {
            const messageId = currentAssistantMessageId.current;
            
            // 메시지 업데이트 - 이전 content에 chunk 추가
            setMessages(prev => prev.map(msg => 
              msg.id === messageId
                ? { ...msg, content: msg.content + message.chunk }
                : msg
            ));
          }
          break;
          
        case 'chat_end':
          // 스트리밍 종료
          if (currentAssistantMessageId.current) {
            setMessages(prev => prev.map(msg => 
              msg.id === currentAssistantMessageId.current
                ? { ...msg, isStreaming: false }
                : msg
            ));
            currentAssistantMessageId.current = null;
            setStreamingContent("");
          }
          setIsLoading(false);
          console.log(`응답 완료: ${message.total_chunks} 청크, ${message.response_length} 문자`);
          break;
          
        case 'chat_error':
        case 'error':
          setError(message.message || "오류가 발생했습니다");
          setIsLoading(false);
          break;
      }
    });

    // 컴포넌트 언마운트 시 정리
    return () => {
      unsubscribe();
    };
  }, []); // dependency 배열을 비워 중복 실행 방지

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
          console.log(`📤 ${selectedEngine} 엔진으로 메시지 전송:`, userMessage.content);
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

  // 초기 메시지에 대한 자동 응답 (한 번만 실행)
  useEffect(() => {
    if (initialMessage && !hasProcessedInitial.current && isConnected) {
      hasProcessedInitial.current = true;
      console.log("초기 메시지 자동 전송:", initialMessage);
      
      // WebSocket으로 메시지 전송
      sendChatMessage(initialMessage, selectedEngine).catch(err => {
        console.error("초기 메시지 전송 실패:", err);
        setError("초기 메시지 전송에 실패했습니다.");
      });
    }
  }, [initialMessage, isConnected, selectedEngine]);

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

            {/* Loading indicator */}
            {isLoading && (
              <div className="mb-1 mt-1">
                <div className="flex items-center gap-3 text-text-300 pl-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm">제목을 생성하고 있습니다...</span>
                  </div>
                </div>
              </div>
            )}

            {/* 스크롤 타겟 */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Bottom Input */}
        <div className="border-t border-border-300/15 bg-bg-100">
          <div className={clsx(
            "mx-auto w-full py-4",
            userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
          )}>
            <fieldset className="flex w-full min-w-0 flex-col px-4">
              <div
                className="!box-content flex flex-col items-stretch transition-all duration-200 relative cursor-text z-10 rounded-2xl"
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
            color: "hsl(var(--text-100))"
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
            아래 {message.titles.length}개의 제목 중에서 가장 적합한 것을 선택하시거나, 수정하여 사용하실 수 있습니다:
          </div>
          <ol className="list-decimal space-y-2 pl-7">
            {message.titles.map((title, index) => (
              <li key={index} className="whitespace-normal break-words group/item relative">
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
            추가로 다른 스타일의 제목이 필요하시거나, 특정 톤앤매너로 수정을 원하시면 말씀해 주세요.
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
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
              strong: ({children}) => <strong className="font-bold text-text-100">{children}</strong>,
              em: ({children}) => <em className="italic">{children}</em>,
              h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-border-200">{children}</h1>,
              h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-5 pb-1 border-b border-border-300">{children}</h2>,
              h3: ({children}) => <h3 className="text-lg font-bold mb-2 mt-4 text-accent-main-100">{children}</h3>,
              ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              code: ({inline, children}) => 
                inline ? (
                  <code className="px-1.5 py-0.5 bg-bg-300 text-accent-main-100 rounded text-sm">{children}</code>
                ) : (
                  <code className="block p-4 bg-bg-200 rounded-lg overflow-x-auto text-sm">{children}</code>
                ),
              pre: ({children}) => <pre className="mb-4">{children}</pre>,
              blockquote: ({children}) => (
                <blockquote className="border-l-4 border-border-300 pl-4 italic my-4">{children}</blockquote>
              ),
              a: ({href, children}) => (
                <a href={href} className="text-accent-main-000 underline hover:text-accent-main-200" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              hr: () => <hr className="my-6 border-border-300" />,
              table: ({children}) => (
                <div className="chatbot-table-wrapper my-4">
                  <table className="w-full">{children}</table>
                </div>
              ),
              thead: ({children}) => <thead className="bg-bg-200">{children}</thead>,
              th: ({children}) => <th className="px-4 py-3 text-left font-semibold border-b-2 border-border-300">{children}</th>,
              td: ({children}) => <td className="px-4 py-3 border-b border-border-400">{children}</td>,
              tbody: ({children}) => <tbody>{children}</tbody>,
              tr: ({children}) => <tr className="hover:bg-bg-100 transition-colors">{children}</tr>
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
                wordBreak: "break-words"
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
