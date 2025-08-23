import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Star,
  Edit3,
} from "lucide-react";
import clsx from "clsx";
import ChatInput from "./ChatInput";
import PromptManagePanel from "./PromptManagePanel";
import T5NH8GuideSection from "./T5NH8GuideSection";
import Header from "./Header";
import * as promptService from '../services/promptService';

const MainContent = ({
  project,
  userRole,
  selectedEngine = "T5",
  onToggleStar,
  onStartChat,
  onLogout,
  onBackToLanding,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef(null);

  // 초기 데이터 로드 (description 가져오기)
  useEffect(() => {
    const loadDescription = async () => {
      try {
        const data = await promptService.getPrompt(selectedEngine);
        if (data.prompt) {
          setCurrentDescription(data.prompt.description || '');
          setEditDescription(data.prompt.description || '');
        }
      } catch (error) {
        console.error('Failed to load description:', error);
      }
    };
    loadDescription();
  }, [selectedEngine]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMoreClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleMenuAction = (action) => {
    setShowDropdown(false);
    if (action === "edit") {
      setShowEditModal(true);
    }
    console.log(`Action: ${action}`);
  };

  const handleSendMessage = (message) => {
    console.log("Message sent:", message);
    onStartChat(message);
  };

  const handleTitlesGenerated = (data) => {
    console.log("Titles generated:", data);
    // 제목이 생성되면 ChatPage로 이동 (App.jsx의 onStartChat를 통해)
    if (data.titles && data.titles.length > 0) {
      // 첫 번째 제목을 메시지로 전달하거나, 원본 메시지를 유지
      // onStartChat는 이미 호출되었으므로 여기서는 추가 동작 불필요
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditTitle(project.title);
    setEditDescription(currentDescription);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // DB에 description 저장
      await promptService.updatePrompt(selectedEngine, { 
        description: editDescription 
      });
      
      setCurrentDescription(editDescription);
      setShowEditModal(false);
      
      // PromptManagePanel 리프레시를 위해 잠시 후 reload
      window.location.reload();
    } catch (error) {
      console.error('Failed to save description:', error);
      alert('설명 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header onLogout={onLogout} onHome={onBackToLanding} />

      {/* Main Grid */}
      <main
        className={clsx(
          "mx-auto mt-4 w-full flex-1 lg:mt-6 flex flex-col gap-6",
          userRole === "admin"
            ? "max-w-7xl xl:flex-row px-6 lg:px-8"
            : "max-w-none px-4 lg:px-6"
        )}
      >
        <div className="flex-1 flex flex-col gap-4">
          {/* Enhanced Chat Interface */}
          <div
            className={clsx(
              "flex flex-col gap-6 max-md:pt-4 mt-6 w-full",
              userRole === "admin"
                ? "items-start max-w-none"
                : "items-center max-w-4xl mx-auto"
            )}
          >
            {/* 관리자는 프로젝트 제목 + 편집 버튼, 사용자는 웰컴 메시지 */}
            {userRole === "admin" ? (
              /* 프로젝트 제목과 편집 버튼을 같은 행에 배치 */
              <div className="flex items-start gap-3 w-full">
                <h1
                  className="min-w-0 gap-1.5 text-left break-words flex-1"
                  style={{
                    margin: "0",
                    marginTop: "0.125rem",
                    overflowWrap: "break-word",
                    textAlign: "left",
                    color: "hsl(var(--text-200))",
                    fontFamily: "var(--font-ui-serif)",
                    lineHeight: "1.3",
                    fontSize: "1.5rem",
                    fontWeight: "500",
                    letterSpacing: "-0.025em",
                    fontFeatureSettings: '"ss01" 0',
                  }}
                >
                  {project.title}
                </h1>

                {/* 편집 버튼들 */}
                <div className="flex items-center gap-1 ml-auto">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="inline-flex items-center justify-center relative shrink-0 select-none text-text-300 border-transparent transition-claude hover:bg-bg-300 hover:text-text-100 h-8 w-8 rounded-md active:scale-95 active:!scale-100 pointer-events-auto"
                      type="button"
                      aria-label={`${project.title}에 대한 더 많은 옵션`}
                      onClick={handleMoreClick}
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                      <div
                        className="absolute right-0 top-full mt-2 z-50 min-w-[8rem] overflow-hidden p-1.5 text-text-300 rounded-xl border-0.5"
                        style={{
                          backgroundColor: "hsl(var(--bg-000))",
                          borderColor: "hsl(var(--border-300)/0.15)",
                          backdropFilter: "blur(12px)",
                          boxShadow: "0 0 0 1px hsl(var(--always-black)/4%)",
                        }}
                        role="menu"
                      >
                        <button
                          onClick={() => handleMenuAction("edit")}
                          className="relative flex w-full min-w-0 select-none items-center rounded-lg border border-transparent px-3 py-2 text-xs text-text-100 transition-colors hover:border-border-100 hover:bg-bg-100 active:bg-bg-200 active:border-border-100 active:text-text-100"
                        >
                          <Edit3 className="mr-2 h-3.5 w-3.5" />
                          <span>세부사항 수정</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    className={clsx(
                      "inline-flex items-center justify-center relative shrink-0 select-none border-transparent transition-claude h-8 w-8 rounded-md active:scale-95 relative *:transition *:ease-in-out *:duration-300",
                      project.isStarred
                        ? "text-accent-main-000"
                        : "text-text-300 hover:bg-bg-300 hover:text-text-100"
                    )}
                    type="button"
                    onClick={onToggleStar}
                    aria-pressed={project.isStarred}
                  >
                    <div className="flex items-center justify-center scale-100 opacity-100 rotate-0">
                      <Star
                        size={20}
                        fill={project.isStarred ? "currentColor" : "none"}
                      />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Welcome Message with Claude Logo (사용자용) */
              <div
                className="font-display text-text-200 w-full flex-col items-center text-center max-md:flex sm:-ml-0.5 sm:block transition-opacity duration-300 ease-in"
                style={{
                  fontSize: "clamp(1.5rem, 1rem + 1.5vw, 2rem)",
                  lineHeight: "1.4",
                }}
              >
                <div
                  className="inline-block align-middle md:mr-3"
                  style={{ paddingTop: "0.1rem" }}
                >
                  <div
                    className="transition-colors text-[#D97757] w-10 inline-block"
                    style={{ position: "relative" }}
                  >
                    <ClaudeLogo />
                  </div>
                </div>
                <div className="inline-block max-w-full align-middle max-md:line-clamp-2 max-md:break-words md:overflow-hidden md:overflow-ellipsis select-none">
                  좋은 아침이에요, 사용자님
                </div>
              </div>
            )}

            {/* Enhanced Chat Input */}
            <div className="top-5 z-10 w-full">
              <div className="w-full">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onStartChat={onStartChat}
                  onTitlesGenerated={handleTitlesGenerated}
                />
              </div>
            </div>

            {/* T5/H8 Guide Section - 사용자만 표시 */}
            {userRole === "user" && (
              <T5NH8GuideSection selectedEngine={selectedEngine} />
            )}
          </div>
        </div>

        {/* Prompt Manage Panel - 관리자만 보임 */}
        {userRole === "admin" && <PromptManagePanel engineType={selectedEngine} />}
      </main>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelEdit();
            }
          }}
        >
          <div
            className="bg-bg-000 rounded-lg p-6 w-full max-w-md"
            style={{
              backgroundColor: "hsl(var(--bg-000))",
              borderColor: "hsl(var(--border-300)/0.15)",
            }}
          >
            <h2 className="text-xl font-semibold text-text-100 mb-4">
              프로젝트 편집
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-200 mb-2">
                  설명
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border-300 rounded-md bg-bg-100 text-text-100 focus:outline-none focus:ring-2 focus:ring-accent-main-000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-text-200 hover:text-text-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-accent-main-000 text-white rounded-md hover:bg-accent-main-100 transition-colors disabled:opacity-50"
                disabled={saving || !editDescription.trim()}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Claude Logo Component
const ClaudeLogo = () => (
  <svg
    overflow="visible"
    width="100%"
    height="100%"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="presentation"
  >
    <path
      d="M96.0000 40.0000 L99.5002 42.0000 L99.5002 43.5000 L98.5000 47.0000 L56.0000 57.0000 L52.0040 47.0708 L96.0000 40.0000 M96.0000 40.0000 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(330deg) scaleY(1.09) rotate(-330deg)",
      }}
    ></path>
    <path
      d="M80.1032 10.5903 L84.9968 11.6171 L86.2958 13.2179 L87.5346 17.0540 L87.0213 19.5007 L58.5000 58.5000 L49.0000 49.0000 L75.3008 14.4873 L80.1032 10.5903 M80.1032 10.5903 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(300deg) scaleY(0.925) rotate(-300deg)",
      }}
    ></path>
    <path
      d="M55.5002 4.5000 L58.5005 2.5000 L61.0002 3.5000 L63.5002 7.0000 L56.6511 48.1620 L52.0005 45.0000 L50.0005 39.5000 L53.5003 8.5000 L55.5002 4.5000 M55.5002 4.5000 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(270deg) scaleY(1.075) rotate(-270deg)",
      }}
    ></path>
    <path
      d="M23.4253 5.1588 L26.5075 1.2217 L28.5175 0.7632 L32.5063 1.3458 L34.4748 2.8868 L48.8202 34.6902 L54.0089 49.8008 L47.9378 53.1760 L24.8009 11.1886 L23.4253 5.1588 M23.4253 5.1588 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(240deg) scaleY(0.94) rotate(-240deg)",
      }}
    ></path>
    <path
      d="M8.4990 27.0019 L7.4999 23.0001 L10.5003 19.5001 L14.0003 20.0001 L15.0003 20.0001 L36.0000 35.5000 L42.5000 40.5000 L51.5000 47.5000 L46.5000 56.0000 L42.0002 52.5000 L39.0001 49.5000 L10.0000 29.0001 L8.4990 27.0019 M8.4990 27.0019 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(210deg) scaleY(1.06) rotate(-210deg)",
      }}
    ></path>
    <path
      d="M2.5003 53.0000 L0.2370 50.5000 L0.2373 48.2759 L2.5003 47.5000 L28.0000 49.0000 L53.0000 51.0000 L52.1885 55.9782 L4.5000 53.5000 L2.5003 53.0000 M2.5003 53.0000 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(180deg) scaleY(0.955) rotate(-180deg)",
      }}
    ></path>
    <path
      d="M17.5002 79.0264 L12.5005 79.0264 L10.5124 76.7369 L10.5124 74.0000 L19.0005 68.0000 L53.5082 46.0337 L57.0005 52.0000 L17.5002 79.0264 M17.5002 79.0264 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(150deg) scaleY(1.10871) rotate(-150deg)",
      }}
    ></path>
    <path
      d="M27.0004 92.9999 L25.0003 93.4999 L22.0003 91.9999 L22.5004 89.4999 L52.0003 50.5000 L56.0004 55.9999 L34.0003 85.0000 L27.0004 92.9999 M27.0004 92.9999 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(120deg) scaleY(1.10038) rotate(-120deg)",
      }}
    ></path>
    <path
      d="M51.9998 98.0000 L50.5002 100.0000 L47.5002 101.0000 L45.0001 99.0000 L43.5000 96.0000 L51.0003 55.4999 L55.5001 55.9999 L51.9998 98.0000 M51.9998 98.0000 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(90deg) scaleY(1.22704) rotate(-90deg)",
      }}
    ></path>
    <path
      d="M77.5007 86.9997 L77.5007 90.9997 L77.0006 92.4997 L75.0004 93.4997 L71.5006 93.0339 L47.4669 57.2642 L56.9998 50.0002 L64.9994 64.5004 L65.7507 69.7497 L77.5007 86.9997 M77.5007 86.9997 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(60deg) scaleY(1.12129) rotate(-60deg)",
      }}
    ></path>
    <path
      d="M89.0008 80.9991 L89.5008 83.4991 L88.0008 85.4991 L86.5007 84.9991 L78.0007 78.9991 L65.0007 67.4991 L55.0007 60.4991 L58.0000 51.0000 L62.9999 54.0001 L66.0007 59.4991 L89.0008 80.9991 M89.0008 80.9991 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(30deg) scaleY(1.08462) rotate(-30deg)",
      }}
    ></path>
    <path
      d="M82.5003 55.5000 L95.0003 56.5000 L98.0003 58.5000 L100.0000 61.5000 L100.0000 63.6587 L94.5003 66.0000 L66.5005 59.0000 L55.0003 58.5000 L58.0000 48.0000 L66.0005 54.0000 L82.5003 55.5000 M82.5003 55.5000 "
      fill="currentColor"
      style={{
        transformOrigin: "50px 50px",
        transform: "rotate(0deg) scaleY(0.999956) rotate(0deg)",
      }}
    ></path>
  </svg>
);

export default MainContent;
