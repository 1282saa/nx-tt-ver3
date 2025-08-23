import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  BarChart3,
  ChevronDown,
  ArrowLeft,
  User,
  CreditCard,
  LogOut,
  Home,
} from "lucide-react";
import clsx from "clsx";

const Header = ({
  showBackButton = false,
  onBack,
  onLogout,
  onAdminLogin,
  onHome,
  chatTitle,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);

  // 외부 클릭 시 사용자 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUserMenuClick = (action) => {
    console.log(`사용자 메뉴: ${action}`);
    setShowUserDropdown(false);

    if (action === "logout" && onLogout) {
      onLogout();
    } else if (action === "dashboard" && onAdminLogin) {
      onAdminLogin();
    }
    // 여기에 각 액션별 로직 추가
  };

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-200"
      style={{
        backdropFilter: "blur(12px)",
        backgroundColor: "hsl(var(--bg-100)/0.95)",
      }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          <div className="flex items-center space-x-4">
            {/* 홈 버튼 */}
            {onHome && (
              <button
                className="flex items-center space-x-2 p-2 rounded-md text-text-300 hover:bg-bg-300 hover:text-text-100 transition-colors"
                onClick={onHome}
              >
                <Home size={20} />
                <span className="hidden sm:inline text-sm font-medium">
                  TITLE-HUB
                </span>
              </button>
            )}

            {/* 뒤로가기 버튼 */}
            {showBackButton && (
              <button
                className="flex items-center space-x-2 p-2 rounded-md text-text-300 hover:bg-bg-300 hover:text-text-100 transition-colors"
                onClick={onBack}
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">뒤로가기</span>
              </button>
            )}

            {/* 모바일 메뉴 */}
            <button className="md:hidden p-2 rounded-md text-text-300 hover:bg-bg-300 hover:text-text-100 transition-colors">
              <Menu size={24} />
            </button>
          </div>

          {/* 채팅 제목 (가운데) */}
          {chatTitle && (
            <div className="flex-1 flex justify-center mx-4">
              <h1 className="text-text-100 font-medium text-sm lg:text-base truncate max-w-md">
                {chatTitle}
              </h1>
            </div>
          )}

          <div className="ml-auto flex items-center space-x-4">
            <div className="hidden md:block">
              <button
                className="flex items-center space-x-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-text-300 hover:bg-bg-300 hover:text-text-100"
                onClick={() => handleUserMenuClick("dashboard")}
              >
                <BarChart3 size={20} />
                <span>대시보드</span>
              </button>
            </div>

            <div className="relative" ref={userDropdownRef}>
              <button
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-bg-300 transition-colors duration-200"
                aria-expanded={showUserDropdown}
                aria-haspopup="true"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                  style={{ backgroundColor: "hsl(var(--accent-main-000))" }}
                >
                  T
                </div>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-text-500 transition-transform duration-200",
                    showUserDropdown ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-lg py-2 z-50"
                  style={{
                    backgroundColor: "hsl(var(--bg-000))",
                    border: "1px solid hsl(var(--bg-300))",
                    boxShadow:
                      "0 0.25rem 1.25rem hsl(var(--always-black)/15%), 0 0 0 0.5px hsla(var(--bg-300)/0.5)",
                  }}
                >
                  <div
                    className="px-4 py-3 border-b"
                    style={{ borderColor: "hsl(var(--bg-300))" }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent-main-000 rounded-full flex items-center justify-center text-white font-medium">
                        T
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-100 truncate">
                          ttrhtt12
                        </p>
                        <p className="text-xs text-text-300 truncate">
                          ttrhtt12@naver.com
                        </p>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1"
                          style={{
                            backgroundColor: "hsl(var(--accent-main-000)/0.1)",
                            color: "hsl(var(--accent-main-000))",
                          }}
                        >
                          사용자
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      className="flex items-center px-4 py-2 text-sm text-text-200 hover:bg-bg-200 w-full text-left transition-colors duration-150"
                      onClick={() => handleUserMenuClick("profile")}
                    >
                      <User className="h-4 w-4 mr-3" />
                      프로필
                    </button>
                    <button
                      className="flex items-center px-4 py-2 text-sm text-text-200 hover:bg-bg-200 w-full text-left transition-colors duration-150"
                      onClick={() => handleUserMenuClick("subscription")}
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      구독 플랜
                    </button>
                  </div>
                  <div
                    className="border-t my-1"
                    style={{ borderColor: "hsl(var(--bg-300))" }}
                  ></div>
                  <button
                    onClick={() => handleUserMenuClick("logout")}
                    className="flex items-center px-4 py-2 text-sm w-full text-left transition-colors duration-150"
                    style={{ color: "hsl(var(--danger-000))" }}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
