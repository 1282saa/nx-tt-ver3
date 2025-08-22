import React, { useState, useRef, useEffect } from "react";
import { Menu, BarChart3, ChevronDown, ArrowLeft } from "lucide-react";
import clsx from "clsx";

const Header = ({ showBackButton = false, onBack, onLogout }) => {
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
          <div className="flex items-center space-x-8">
            {showBackButton && (
              <button
                className="flex items-center space-x-2 p-2 rounded-md text-text-300 hover:bg-bg-300 hover:text-text-100 transition-colors"
                onClick={onBack}
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">뒤로가기</span>
              </button>
            )}
            <button className="md:hidden p-2 rounded-md text-text-300 hover:bg-bg-300 hover:text-text-100 transition-colors">
              <Menu size={24} />
            </button>
          </div>

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
                  className="absolute right-0 top-full mt-2 z-50 min-w-[12rem] overflow-hidden p-1.5 text-text-300 rounded-xl border-0.5"
                  style={{
                    backgroundColor: "hsl(var(--bg-000))",
                    borderColor: "hsl(var(--border-300)/0.15)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 0 0 1px hsl(var(--always-black)/4%)",
                  }}
                  role="menu"
                >
                  <div
                    role="menuitem"
                    className="font-base py-1.5 px-2 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-2 items-center outline-none select-none hover:bg-bg-200 hover:text-text-000 text-left"
                    onClick={() => handleUserMenuClick("profile")}
                  >
                    <span>프로필 설정</span>
                  </div>
                  <div
                    role="menuitem"
                    className="font-base py-1.5 px-2 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-2 items-center outline-none select-none hover:bg-bg-200 hover:text-text-000 text-left"
                    onClick={() => handleUserMenuClick("logout")}
                  >
                    <span>로그아웃</span>
                  </div>
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
