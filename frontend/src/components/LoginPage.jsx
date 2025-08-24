import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
import authService from "../services/authService";

const LoginPage = ({ onLogin, onGoToSignUp, selectedEngine: propEngine }) => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEngine, setSelectedEngine] = useState(propEngine || "T5");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // navigation state나 prop에서 엔진 정보 가져오기
    if (location.state?.engine) {
      setSelectedEngine(location.state.engine);
    } else if (propEngine) {
      setSelectedEngine(propEngine);
    }

    // Remember Me 기능으로 저장된 사용자명 불러오기
    const savedUsername = localStorage.getItem('rememberUsername');
    if (savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
      setRememberMe(true);
    }
  }, [location, propEngine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password) {
      setError("사용자명과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signIn(formData.username, formData.password);

      if (result.success) {
        // 로그인 성공
        const userInfo = {
          ...result.user,
          selectedEngine: selectedEngine
        };
        
        // 사용자 정보 저장
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('authToken', result.tokens.accessToken); // accessToken 사용
        localStorage.setItem('idToken', result.tokens.idToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('selectedEngine', selectedEngine);
        
        // 사용자 역할 결정 - 특정 계정은 관리자로 설정
        let userRole = 'user';
        if (formData.username === 'ai@sedaily.com' || result.user.email === 'ai@sedaily.com') {
          userRole = 'admin';
        } else if (result.user.email?.includes('@sedaily.com')) {
          // 다른 sedaily.com 도메인 사용자도 관리자로 설정 (옵션)
          userRole = 'admin';
        }
        localStorage.setItem('userRole', userRole);
        
        // Remember Me 처리
        if (rememberMe) {
          localStorage.setItem('rememberUsername', formData.username);
        } else {
          localStorage.removeItem('rememberUsername');
        }

        // Header에 사용자 정보 업데이트 알림
        window.dispatchEvent(new CustomEvent('userInfoUpdated'));

        // 로그인 성공 콜백
        onLogin(userRole);
      } else {
        if (result.needsNewPassword) {
          setError("새 비밀번호를 설정해야 합니다. 관리자에게 문의하세요.");
        } else {
          setError(result.error || "로그인에 실패했습니다.");
        }
      }
    } catch (err) {
      console.error("로그인 오류:", err);
      
      // 이메일 인증이 필요한 경우
      if (err.name === 'UserNotConfirmedException' || err.message?.includes('not confirmed')) {
        setNeedsVerification(true);
        setError("이메일 인증이 필요합니다. 인증 코드를 입력해주세요.");
      } else {
        setError(authService.getErrorMessage(err) || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setError("");

    if (!verificationCode || verificationCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.confirmSignUp(formData.username, verificationCode);

      if (result.success) {
        // 인증 성공 후 자동 로그인
        const loginResult = await authService.signIn(formData.username, formData.password);
        
        if (loginResult.success) {
          const userInfo = {
            ...loginResult.user,
            selectedEngine: selectedEngine
          };
          
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          localStorage.setItem('authToken', loginResult.tokens.accessToken); // accessToken 사용
          localStorage.setItem('idToken', loginResult.tokens.idToken);
          localStorage.setItem('refreshToken', loginResult.tokens.refreshToken);
          localStorage.setItem('isLoggedIn', 'true');
          
          // 사용자 역할 결정 - 특정 계정은 관리자로 설정
          let userRole = 'user';
          if (formData.username === 'ai@sedaily.com' || loginResult.user.email === 'ai@sedaily.com') {
            userRole = 'admin';
          } else if (loginResult.user.email?.includes('@sedaily.com')) {
            userRole = 'admin';
          }
          localStorage.setItem('userRole', userRole);
          
          // Header에 사용자 정보 업데이트 알림
          window.dispatchEvent(new CustomEvent('userInfoUpdated'));
          
          onLogin(userRole);
        } else {
          setError("인증은 완료되었지만 로그인에 실패했습니다. 다시 시도해주세요.");
          setNeedsVerification(false);
        }
      } else {
        setError(result.error || "인증에 실패했습니다.");
      }
    } catch (err) {
      console.error("인증 오류:", err);
      setError("인증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await authService.resendConfirmationCode(formData.username);
      
      if (result.success) {
        alert(result.message || "인증 코드가 재발송되었습니다.");
      } else {
        setError(result.error || "인증 코드 재발송에 실패했습니다.");
      }
    } catch (err) {
      console.error("인증 코드 재발송 오류:", err);
      setError("인증 코드 재발송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(""); // 입력 시 에러 메시지 제거
  };

  const handleForgotPassword = () => {
    alert("비밀번호 재설정 기능은 준비 중입니다.\n관리자에게 문의해주세요.");
  };

  // 이메일 인증 폼
  if (needsVerification) {
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
              이메일 인증
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: "hsl(var(--text-300))" }}>
              등록된 이메일로 발송된 6자리 인증 코드를 입력해주세요
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleVerification}>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium mb-1"
                style={{ color: "hsl(var(--text-200))" }}
              >
                인증 코드
              </label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength="6"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="appearance-none relative block w-full px-3 py-2 text-center text-2xl tracking-widest rounded-md focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  border: "0.5px solid hsl(var(--border-300)/0.15)",
                  color: "hsl(var(--text-100))",
                }}
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="rounded-md p-4" style={{ backgroundColor: "hsl(var(--danger-100))" }}>
                <p className="text-sm" style={{ color: "hsl(var(--danger-000))" }}>
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className={clsx(
                  "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2",
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                )}
                style={{
                  backgroundColor: "hsl(var(--accent-main-000))",
                }}
              >
                {isLoading ? "인증 중..." : "인증하기"}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full text-sm hover:underline"
                style={{ color: "hsl(var(--text-300))" }}
              >
                인증 코드 재발송
              </button>

              <button
                type="button"
                onClick={() => setNeedsVerification(false)}
                className="w-full text-sm hover:underline"
                style={{ color: "hsl(var(--text-300))" }}
              >
                로그인 화면으로 돌아가기
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 로그인 폼
  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "hsl(var(--bg-100))" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                 style={{ backgroundColor: "hsl(var(--accent-main-000))" }}>
              <span className="text-2xl font-bold text-white">
                {selectedEngine}
              </span>
            </div>
          </div>
          <h2
            className="mt-6 text-center text-3xl font-extrabold"
            style={{ color: "hsl(var(--text-100))" }}
          >
            TITLE-HUB 로그인
          </h2>
          <p
            className="mt-2 text-center text-sm"
            style={{ color: "hsl(var(--text-300))" }}
          >
            {selectedEngine} 엔진으로 AI 제목 생성 시작하기
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1"
                style={{ color: "hsl(var(--text-200))" }}
              >
                사용자명 또는 이메일
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  border: "0.5px solid hsl(var(--border-300)/0.15)",
                  color: "hsl(var(--text-100))",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "hsl(var(--accent-main-100))";
                  e.target.style.boxShadow = "0 0 0 2px hsl(var(--accent-main-100)/0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "hsl(var(--border-300)/0.15)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="사용자명 또는 이메일"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: "hsl(var(--text-200))" }}
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200"
                style={{
                  backgroundColor: "hsl(var(--bg-000))",
                  border: "0.5px solid hsl(var(--border-300)/0.15)",
                  color: "hsl(var(--text-100))",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "hsl(var(--accent-main-100))";
                  e.target.style.boxShadow = "0 0 0 2px hsl(var(--accent-main-100)/0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "hsl(var(--border-300)/0.15)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="비밀번호"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{
                  accentColor: "hsl(var(--accent-main-000))",
                }}
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm"
                style={{ color: "hsl(var(--text-300))" }}
              >
                로그인 정보 저장
              </label>
            </div>

            <button
              type="button"
              className="text-sm hover:underline"
              style={{ color: "hsl(var(--accent-main-100))" }}
              onClick={handleForgotPassword}
            >
              비밀번호 찾기
            </button>
          </div>

          {error && (
            <div className="rounded-md p-4" style={{ backgroundColor: "hsl(var(--danger-100))" }}>
              <p className="text-sm" style={{ color: "hsl(var(--danger-000))" }}>
                {error}
              </p>
            </div>
          )}

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
                  e.target.style.backgroundColor = "hsl(var(--accent-main-200))";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = "hsl(var(--accent-main-000))";
                }
              }}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm" style={{ color: "hsl(var(--text-300))" }}>
              아직 계정이 없으신가요?{" "}
            </span>
            <button
              type="button"
              className="text-sm font-medium hover:underline"
              style={{ color: "hsl(var(--accent-main-100))" }}
              onClick={onGoToSignUp}
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;