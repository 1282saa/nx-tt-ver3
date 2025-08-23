import React, { useState } from "react";
import clsx from "clsx";

const LoginPage = ({ onLogin, onGoToSignUp }) => {
  const [email, setEmail] = useState("ai@sedaily.com");
  const [password, setPassword] = useState("Sedaily2024!");
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState("user"); // 'admin' | 'user'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 로그인 시뮬레이션
    setTimeout(() => {
      console.log("로그인:", { email, password, accountType });
      setIsLoading(false);
      onLogin(accountType);
    }, 1000);
  };

  const handleForgotPassword = () => {
    console.log("비밀번호 찾기");
  };

  const handleSignUp = () => {
    onGoToSignUp();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "hsl(var(--bg-100))" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2
            className="mt-6 text-center text-3xl font-extrabold"
            style={{ color: "hsl(var(--text-100))" }}
          >
            로그인
          </h2>
          <p
            className="mt-2 text-center text-sm"
            style={{ color: "hsl(var(--text-300))" }}
          >
            TITLE-NOMICS AI 제목 생성 시스템
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 계정 타입 선택 */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "hsl(var(--text-200))" }}
              >
                계정 타입
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="user"
                    checked={accountType === "user"}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="mr-2 text-accent-main-100"
                  />
                  <span style={{ color: "hsl(var(--text-100))" }}>사용자</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="admin"
                    checked={accountType === "admin"}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="mr-2 text-accent-main-100"
                  />
                  <span style={{ color: "hsl(var(--text-100))" }}>관리자</span>
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  border: "0.5px solid hsl(var(--border-300)/0.15)",
                  color: "hsl(var(--text-100))",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "hsl(var(--accent-main-100))";
                  e.target.style.boxShadow =
                    "0 0 0 2px hsl(var(--accent-main-100)/0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "hsl(var(--border-300)/0.15)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  border: "0.5px solid hsl(var(--border-300)/0.15)",
                  color: "hsl(var(--text-100))",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "hsl(var(--accent-main-100))";
                  e.target.style.boxShadow =
                    "0 0 0 2px hsl(var(--accent-main-100)/0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "hsl(var(--border-300)/0.15)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                "group relative w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200",
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02] active:scale-[0.98]"
              )}
              style={{
                backgroundColor: "hsl(var(--accent-main-000))",
                color: "hsl(var(--oncolor-100))",
                border: "none",
                boxShadow: "0 1px 3px 0 hsl(var(--always-black)/0.1)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor =
                    "hsl(var(--accent-main-200))";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor =
                    "hsl(var(--accent-main-000))";
                }
              }}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm transition-colors duration-200 block w-full hover:underline"
              style={{ color: "hsl(var(--accent-main-100))" }}
              onMouseEnter={(e) => {
                e.target.style.color = "hsl(var(--accent-main-000))";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "hsl(var(--accent-main-100))";
              }}
              onClick={handleForgotPassword}
            >
              비밀번호를 잊으셨나요?
            </button>
            <button
              type="button"
              className="text-sm transition-colors duration-200 block w-full hover:underline"
              style={{ color: "hsl(var(--accent-main-100))" }}
              onMouseEnter={(e) => {
                e.target.style.color = "hsl(var(--accent-main-000))";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "hsl(var(--accent-main-100))";
              }}
              onClick={handleSignUp}
            >
              계정이 없으신가요? 회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
