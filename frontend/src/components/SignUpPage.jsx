import React, { useState } from "react";
import clsx from "clsx";

const SignUpPage = ({ onSignUp, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    fullname: "",
    email: "ai@sedaily.com",
    password: "Sedaily2024!",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    // 회원가입 시뮬레이션
    setTimeout(() => {
      console.log("회원가입:", formData);
      setIsLoading(false);
      onSignUp();
    }, 1000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
            회원가입
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
            <div>
              <label
                htmlFor="fullname"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                이름
              </label>
              <input
                id="fullname"
                name="fullname"
                type="text"
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
                placeholder="이름 (선택사항)"
                value={formData.fullname}
                onChange={(e) => handleInputChange("fullname", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                이메일 *
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
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                비밀번호 *
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
                placeholder="비밀번호 (8자 이상, 대소문자, 숫자, 특수문자 포함)"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium"
                style={{ color: "hsl(var(--text-200))" }}
              >
                비밀번호 확인 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
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
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
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
              {isLoading ? "회원가입 중..." : "회원가입"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm transition-colors duration-200 w-full hover:underline"
              style={{ color: "hsl(var(--accent-main-100))" }}
              onMouseEnter={(e) => {
                e.target.style.color = "hsl(var(--accent-main-000))";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "hsl(var(--accent-main-100))";
              }}
              onClick={onBackToLogin}
            >
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
