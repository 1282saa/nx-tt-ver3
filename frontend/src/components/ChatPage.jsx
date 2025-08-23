import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Plus,
  Settings,
  Search,
  ChevronDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Edit3,
  Loader2,
} from "lucide-react";
import Header from "./Header";
import clsx from "clsx";
import { generateTitles, generateTitlesMock } from "../services/api";

const ChatPage = ({
  initialMessage,
  userRole,
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

  // 페이지 하단으로 스크롤하는 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
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
        // 개발 환경에서는 Mock 사용, 프로덕션에서는 실제 API 사용
        const useMock = import.meta.env.VITE_USE_MOCK === "true";
        const generateFn = useMock ? generateTitlesMock : generateTitles;

        const result = await generateFn(userMessage.content);

        const assistantMessage = {
          id: messages.length + 2,
          type: "assistant",
          content: "", // Content is now handled by the titles array
          timestamp: new Date(),
          titles: result.titles, // 제목 배열 저장
          model: result.model, // 모델 정보 저장
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("제목 생성 오류:", err);
        setError(err.message || "제목 생성 중 오류가 발생했습니다.");

        const errorMessage = {
          id: messages.length + 2,
          type: "assistant",
          content: `죄송합니다. 제목 생성 중 오류가 발생했습니다: ${err.message}`,
          timestamp: new Date(),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
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
    scrollToBottom();
  }, [messages]);

  return (
    <div>
      <Header
        showBackButton={true}
        onBack={onBack}
        onLogout={onLogout}
        onHome={onBackToLanding}
      />

      <div className="relative h-full flex-1 flex overflow-x-hidden overflow-y-scroll pt-6">
        <div
          className={clsx(
            "relative mx-auto flex h-full w-full flex-1 flex-col md:px-2",
            userRole === "admin" ? "max-w-3xl" : "max-w-4xl"
          )}
        >
          <div className="flex-1 flex flex-col gap-3 px-4 max-w-3xl mx-auto w-full pt-1">
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
                <div className="flex items-center gap-3 text-text-300">
                  <div className="ml-1">
                    <div className="w-8 text-accent-brand inline-block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 100 100"
                        className="w-full fill-current animate-pulse"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="8"
                          fill="currentColor"
                          opacity="0.6"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm">제목을 생성하고 있습니다...</span>
                  </div>
                </div>
              </div>
            )}

            {/* 스크롤 타겟 */}
            <div ref={messagesEndRef} />

            {/* Spacer */}
            <div aria-hidden="true" style={{ height: "524px" }}></div>
          </div>

          {/* Bottom Input */}
          <div className="sticky bottom-0 mx-auto w-full pt-6 z-[5]">
            <fieldset className="flex w-full min-w-0 flex-col">
              <input
                id="chat-input-file-upload-bottom"
                data-testid="file-upload"
                aria-hidden="true"
                tabIndex="-1"
                className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0 select-none"
                accept=".pdf,.docx,.rtf,.epub,.odt,.odp,.txt,.py,.ipynb,.js,.jsx,.html,.css,.java,.cs,.php,.c,.cc,.cpp,.cxx,.cts,.h,.hh,.hpp,.rs,.R,.Rmd,.swift,.go,.rb,.kt,.kts,.ts,.tsx,.m,.mm,.mts,.scala,.dart,.lua,.pl,.pm,.t,.sh,.bash,.zsh,.csv,.log,.ini,.cfg,.config,.json,.proto,.yaml,.yml,.toml,.sql,.bat,.md,.coffee,.tex,.latex,.gd,.gdshader,.tres,.tscn,.jpg,.jpeg,.png,.gif,.webp,.csv,.xls,.xlsx,.xlsb,.xlm,.xlsm,.xlt,.xltm,.xltx,.ods"
                multiple
                aria-label="파일 업로드"
                type="file"
              />

              <div className="px-3 md:px-2"></div>

              <div
                className="!box-content flex flex-col items-stretch transition-all duration-200 relative cursor-text z-10 rounded-2xl border border-transparent mx-2 md:mx-0"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  boxShadow:
                    "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%), 0 0 0 0.5px hsla(var(--border-300)/0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%), 0 0 0 0.5px hsla(var(--border-200)/0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0.25rem 1.25rem hsl(var(--always-black)/3.5%), 0 0 0 0.5px hsla(var(--border-300)/0.15)";
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

                    {/* Model Selector */}
                    <div className="overflow-hidden shrink-0 p-1 -m-1">
                      <button
                        className="inline-flex items-center justify-center relative shrink-0 can-focus select-none h-7 border-0.5 text-text-100 ml-1.5 inline-flex items-start gap-[0.175em] rounded-md border-transparent text-sm opacity-80 transition hover:opacity-100 disabled:!opacity-80 hover:bg-bg-100 hover:border-border-400 px-1.5"
                        type="button"
                      >
                        <div className="font-claude-response inline-flex gap-[3px] text-[14px] h-[14px] leading-none items-baseline">
                          <ClaudeLogo />
                          <div className="flex items-center gap-[4px]">
                            <div className="whitespace-nowrap tracking-tight select-none">
                              Sonnet 4
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          size={12}
                          className="text-text-500 shrink-0"
                        />
                      </button>
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

              <div
                className="w-full h-2"
                style={{ backgroundColor: "hsl(var(--bg-100))" }}
              ></div>
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
          className="font-ui grid grid-cols-1 gap-2 py-0.5 text-[0.9375rem] leading-6 tracking-tight"
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

  return (
    <>
      <div data-test-render-count="1">
        <div style={{ height: "auto", opacity: 1, transform: "none" }}>
          <div
            data-is-streaming="false"
            className="group relative -tracking-[0.015em] pb-3"
            style={{ opacity: 1, transform: "none" }}
          >
            <div className="relative px-2 md:px-8">
              {/* If message has titles array, display as styled list */}
              {message.titles ? (
                <div className="grid-cols-1 grid gap-2.5 [&_>_*]:min-w-0">
                  <p className="whitespace-normal break-words text-text-200">
                    안녕하세요! 기사 제목을 생성했습니다.
                  </p>
                  <p className="whitespace-normal break-words text-text-200">
                    아래 {message.titles.length}개의 제목 중에서 가장 적합한 것을 선택하시거나, 수정하여 사용하실 수 있습니다:
                  </p>
                  <ol className="[&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 list-decimal space-y-2.5 pl-7">
                    {message.titles.map((title, index) => (
                      <li key={index} className="whitespace-normal break-words group relative">
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex-1 text-text-100">
                            {title}
                          </span>
                          <button
                            onClick={() => handleCopyTitle(title, index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-bg-300 rounded-md shrink-0 ml-2"
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
                  <p className="whitespace-normal break-words text-text-200 mt-2">
                    추가로 다른 스타일의 제목이 필요하시거나, 특정 톤앤매너로 수정을 원하시면 말씀해 주세요.
                  </p>
                  {message.model && (
                    <p className="text-xs text-text-400 mt-2">
                      사용 모델: {message.model}
                    </p>
                  )}
                </div>
              ) : message.isError ? (
                <div className="grid-cols-1 grid gap-2.5 [&_>_*]:min-w-0">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 whitespace-normal break-words">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="grid-cols-1 grid gap-2.5 [&_>_*]:min-w-0">
                  {message.content.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="whitespace-normal break-words">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className="absolute bottom-1 right-2 pointer-events-none z-10"
            style={{ transform: "none" }}
          >
            <div className="rounded-lg transition min-w-max pointer-events-auto translate-x-2 pt-2">
              <div className="text-text-300 flex items-stretch justify-between">
                <button className="inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-300 border-transparent transition font-ui tracking-tight duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-bg-300 hover:text-text-100 h-8 w-8 rounded-md active:scale-95 select-auto">
                  <Copy size={20} />
                </button>
                <button className="inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-300 border-transparent transition font-ui tracking-tight duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-bg-300 hover:text-text-100 h-8 w-8 rounded-md active:scale-95 select-auto">
                  <ThumbsUp size={20} />
                </button>
                <button className="inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-300 border-transparent transition font-ui tracking-tight duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-bg-300 hover:text-text-100 h-8 w-8 rounded-md active:scale-95 select-auto">
                  <ThumbsDown size={20} />
                </button>
                <div className="flex items-center">
                  <button className="inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-300 border-transparent transition font-ui tracking-tight duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-bg-300 hover:text-text-100 h-8 rounded-md px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap !text-xs pl-2.5 pr-2 gap-1 !font-base select-none !pl-2 !pr-1">
                    재시도
                    <ChevronDown size={20} className="text-text-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Claude Logo */}
        <div className="ml-1 mt-0.5 flex items-center transition-transform duration-300 ease-out">
          <div className="p-1 -translate-x-px">
            <div className="w-8 text-accent-brand inline-block select-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                className="w-full fill-current"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="8"
                  fill="currentColor"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>
          <div className="text-text-500 px-2 mt-6 flex-1 text-right text-[0.65rem] leading-[0.85rem] tracking-tighter sm:text-[0.75rem]">
            <a
              target="_blank"
              className="inline-block select-none opacity-90 delay-300 duration-700 hover:text-text-300 transition"
              href="https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on"
            >
              Claude는 실수를 할 수 있습니다. <br className="block sm:hidden" />
              응답을 반드시 다시 확인해 주세요.
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

const ClaudeLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 139 34"
    className="w-full fill-current"
    height="11.5"
  >
    <path d="M18.07 30.79c-5.02 0-8.46-2.8-10.08-7.11a19.2 19.2 0 0 1-1.22-7.04C6.77 9.41 10 4.4 17.16 4.4c4.82 0 7.78 2.1 9.48 7.1h2.06l-.28-6.9c-2.88-1.86-6.48-2.81-10.87-2.81-6.16 0-11.41 2.77-14.34 7.74A16.77 16.77 0 0 0 1 18.2c0 5.53 2.6 10.42 7.5 13.15a17.51 17.51 0 0 0 8.74 2.06c4.78 0 8.57-.91 11.93-2.5l.87-7.62h-2.1c-1.26 3.48-2.76 5.57-5.25 6.68-1.22.55-2.76.83-4.62.83Zm21.65-26.4.2-3.39H38.5l-6.33 1.9v1.02l2.8 1.3v23.79c0 1.62-.82 1.98-3 2.25V33h10.75v-1.74c-2.17-.27-3-.63-3-2.25V4.4Zm42.75 29h.83l7.27-1.38v-1.78l-1.03-.07c-1.7-.16-2.13-.52-2.13-1.9V15.58l.2-4.07h-1.15l-6.87.99v1.73l.67.12c1.85.28 2.4.8 2.4 2.1v11.3C80.9 29.13 79.2 30 77.19 30c-2.26 0-3.64-1.15-3.64-3.8V15.58l.2-4.07h-1.19l-6.87.99v1.73l.71.12c1.86.28 2.41.8 2.41 2.1v10.43c0 4.42 2.49 6.52 6.48 6.52 3.04 0 5.53-1.62 7.39-3.88l-.2 3.88Zm-20-14.06c0-5.65-3-7.82-8.4-7.82-4.79 0-8.27 1.97-8.27 5.25 0 1 .36 1.74 1.07 2.25l3.64-.47c-.16-1.1-.24-1.78-.24-2.05 0-1.86.99-2.8 3-2.8 2.97 0 4.47 2.09 4.47 5.44v1.11l-7.51 2.25c-2.49.67-3.91 1.27-4.86 2.65a5 5 0 0 0-.71 2.8c0 3.2 2.21 5.46 5.97 5.46 2.72 0 5.13-1.23 7.23-3.56.75 2.33 1.9 3.56 3.95 3.56 1.66 0 3.16-.68 4.5-1.98l-.4-1.38c-.59.16-1.14.23-1.73.23-1.15 0-1.7-.9-1.7-2.68v-8.26Zm-9.6 10.87c-2.05 0-3.31-1.19-3.31-3.28 0-1.43.67-2.26 2.1-2.73l6.08-1.94v5.85c-1.94 1.46-3.08 2.1-4.86 2.1Zm63.3 1.81v-1.78l-1.02-.07c-1.7-.16-2.14-.52-2.14-1.9V4.4l.2-3.4h-1.42l-6.32 1.9v1.02l2.8 1.3v7.83a8.84 8.84 0 0 0-5.37-1.54c-6.28 0-11.18 4.78-11.18 11.93 0 5.89 3.51 9.96 9.32 9.96 3 0 5.61-1.47 7.23-3.72l-.2 3.72h.83l7.27-1.39Zm-13.15-18.13c3 0 5.25 1.74 5.25 4.94v9a7.2 7.2 0 0 1-5.21 2.1c-4.31 0-6.48-3.4-6.48-7.94 0-5.1 2.48-8.1 6.44-8.1Zm28.52 4.5c-.55-2.64-2.17-4.15-4.42-4.15-3.36 0-5.7 2.53-5.7 6.17 0 5.37 2.85 8.85 7.44 8.85a8.6 8.6 0 0 0 7.38-4.35l1.35.36c-.6 4.66-4.82 8.14-10 8.14-6.08 0-10.27-4.5-10.27-10.9 0-6.45 4.54-11 10.63-11 4.54 0 7.74 2.73 8.77 7.48l-15.84 4.85V21.7l10.66-3.32Z" />
  </svg>
);

export default ChatPage;
