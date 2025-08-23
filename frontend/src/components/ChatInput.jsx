import React, { useState, useRef, useEffect } from "react";
import { Plus, Settings, Search, ArrowUp } from "lucide-react";
import clsx from "clsx";
import {
  connectWebSocket,
  disconnectWebSocket,
  sendChatMessage,
  isWebSocketConnected,
} from "../services/websocketService";

const ChatInput = ({
  onSendMessage,
  onStartChat,
  onTitlesGenerated,
  engineType = "T5",
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const textareaRef = useRef(null);

  // WebSocket 연결 관리
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

    // 컴포넌트 언마운트 시 정리
    return () => {
      // disconnectWebSocket(); // 앱 전체에서 공유하므로 여기서 끊지 않음
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      const messageText = message.trim();

      // onStartChat가 있으면 ChatPage로 네비게이션 (MainContent에서 사용)
      // 이 경우 WebSocket 메시지는 ChatPage에서 전송됨
      if (onStartChat) {
        console.log("🔀 ChatPage로 네비게이션 - 메시지:", messageText);
        // 메시지 초기화를 먼저 하여 중복 호출 방지
        setMessage("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        // 그 다음 페이지 전환
        onStartChat(messageText);
        return; // 여기서 종료
      }
      
      // onSendMessage가 있으면 현재 페이지에서 처리 (ChatPage에서 사용)
      if (onSendMessage) {
        onSendMessage(messageText);
      }

      // ChatPage에서만 WebSocket으로 메시지 전송
      if (!onStartChat && isConnected) {
        setIsLoading(true);
        try {
          console.log(`${engineType} 엔진으로 메시지 전송:`, messageText);
          await sendChatMessage(messageText, engineType);

          // WebSocket 응답은 별도의 리스너에서 처리
          // onTitlesGenerated는 WebSocket 메시지 핸들러에서 호출됨
        } catch (error) {
          console.error("메시지 전송 실패:", error);
          // 에러 메시지 표시
          if (onTitlesGenerated) {
            onTitlesGenerated({
              error: true,
              message: "메시지 전송에 실패했습니다. 연결을 확인해주세요.",
            });
          }
        } finally {
          setIsLoading(false);
        }
      } else if (!onStartChat && !isConnected) {
        console.warn("WebSocket이 연결되지 않았습니다. 재연결 시도 중...");
        // 재연결 시도
        try {
          await connectWebSocket();
          setIsConnected(true);
          // 재연결 후 다시 시도
          handleSubmit(e);
        } catch (error) {
          console.error("WebSocket 재연결 실패:", error);
          if (onTitlesGenerated) {
            onTitlesGenerated({
              error: true,
              message: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
            });
          }
        }
      }

      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    setIsTyping(value.length > 0);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <fieldset className="flex w-full min-w-0 flex-col">
      <div
        className="!box-content flex flex-col bg-bg-000 mx-0 items-stretch transition-all duration-200 relative cursor-text z-10 rounded-2xl border border-border-300/15"
        style={{
          boxShadow: "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%)";
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = "0 0.25rem 1.25rem hsl(var(--always-black)/7.5%)";
        }}
      >
        <div className="flex flex-col gap-3.5 m-3.5">
          {/* Input Area */}
          <div className="relative">
            <div className="max-h-96 w-full overflow-y-auto font-large break-words transition-opacity duration-200 min-h-[1.5rem]">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isConnected ? "오늘 어떤 도움을 드릴까요?" : "서버 연결 중..."
                }
                className="w-full min-h-[1.5rem] max-h-96 resize-none bg-transparent border-none outline-none text-text-100 placeholder-text-500 font-large leading-relaxed"
                rows={1}
                disabled={!isConnected}
                style={{
                  fieldSizing: "content",
                  overflow: "hidden",
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2.5 w-full items-center">
            <div className="relative flex-1 flex items-center gap-2 shrink min-w-0">
              {/* Left Controls */}
              <div className="relative shrink-0">
                <div className="flex items-center">
                  <button
                    className="claude-button group"
                    type="button"
                    aria-label="첨부파일 메뉴 열기"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="relative shrink-0">
                <div className="flex items-center">
                  <button
                    className="claude-button group"
                    type="button"
                    aria-label="도구 메뉴 열기"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className="flex shrink min-w-8 !shrink-0">
                <button
                  className="claude-button group flex shrink min-w-8 !shrink-0"
                  type="button"
                >
                  <Search size={16} />
                  <p className="min-w-0 pl-1 text-xs tracking-tight text-ellipsis whitespace-nowrap break-words overflow-hidden shrink">
                    연구
                  </p>
                </button>
              </div>
            </div>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1">
              <div
                className={clsx(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
                )}
              />
            </div>

            {/* Send Button */}
            <div className="opacity-100">
              <button
                className={clsx(
                  "inline-flex items-center justify-center relative shrink-0 select-none transition-colors h-8 w-8 rounded-md active:scale-95 !rounded-lg !h-8 !w-8",
                  isLoading
                    ? "bg-accent-main-100 text-white cursor-wait"
                    : isTyping && isConnected
                    ? "bg-accent-main-000 text-white hover:bg-accent-main-200"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                )}
                disabled={!isTyping || isLoading || !isConnected}
                type="button"
                onClick={handleSubmit}
                aria-label="메시지 보내기"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};

export default ChatInput;
