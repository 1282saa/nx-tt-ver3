import React from 'react';
import clsx from 'clsx';

const LoginPresenter = ({
  // Data props
  formData,
  isLoading,
  error,
  selectedEngine,
  needsVerification,
  verificationCode,
  rememberMe,
  
  // Action props
  onSubmit,
  onVerification,
  onResendCode,
  onInputChange,
  onForgotPassword,
  onVerificationCodeChange,
  onRememberMeChange,
  onBackToLogin,
  onGoToSignUp,
}) => {
  // 이메일 인증 폼
  if (needsVerification) {
    return (
      <VerificationForm
        verificationCode={verificationCode}
        error={error}
        isLoading={isLoading}
        onSubmit={onVerification}
        onVerificationCodeChange={onVerificationCodeChange}
        onResendCode={onResendCode}
        onBackToLogin={onBackToLogin}
      />
    );
  }

  // 로그인 폼
  return (
    <LoginForm
      formData={formData}
      isLoading={isLoading}
      error={error}
      selectedEngine={selectedEngine}
      rememberMe={rememberMe}
      onSubmit={onSubmit}
      onInputChange={onInputChange}
      onForgotPassword={onForgotPassword}
      onRememberMeChange={onRememberMeChange}
      onGoToSignUp={onGoToSignUp}
    />
  );
};

// 로그인 폼 컴포넌트
const LoginForm = ({
  formData,
  isLoading,
  error,
  selectedEngine,
  rememberMe,
  onSubmit,
  onInputChange,
  onForgotPassword,
  onRememberMeChange,
  onGoToSignUp,
}) => (
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

      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
        <div className="space-y-4">
          <InputField
            id="username"
            label="사용자명 또는 이메일"
            type="text"
            value={formData.username}
            onChange={(e) => onInputChange("username", e.target.value)}
            autoComplete="username"
            placeholder="사용자명 또는 이메일"
          />

          <InputField
            id="password"
            label="비밀번호"
            type="password"
            value={formData.password}
            onChange={(e) => onInputChange("password", e.target.value)}
            autoComplete="current-password"
            placeholder="비밀번호"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
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
            onClick={onForgotPassword}
          >
            비밀번호 찾기
          </button>
        </div>

        {error && <ErrorMessage message={error} />}

        <SubmitButton isLoading={isLoading} text={isLoading ? "로그인 중..." : "로그인"} />

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

// 인증 폼 컴포넌트
const VerificationForm = ({
  verificationCode,
  error,
  isLoading,
  onSubmit,
  onVerificationCodeChange,
  onResendCode,
  onBackToLogin,
}) => (
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
      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
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
            onChange={(e) => onVerificationCodeChange(e.target.value.replace(/[^0-9]/g, ''))}
            className="appearance-none relative block w-full px-3 py-2 text-center text-2xl tracking-widest rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: "hsl(var(--bg-000))",
              border: "0.5px solid hsl(var(--border-300)/0.15)",
              color: "hsl(var(--text-100))",
            }}
            placeholder="000000"
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="space-y-3">
          <SubmitButton isLoading={isLoading} text={isLoading ? "인증 중..." : "인증하기"} />

          <button
            type="button"
            onClick={onResendCode}
            disabled={isLoading}
            className="w-full text-sm hover:underline"
            style={{ color: "hsl(var(--text-300))" }}
          >
            인증 코드 재발송
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
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

// 입력 필드 컴포넌트
const InputField = ({ id, label, type, value, onChange, autoComplete, placeholder }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium mb-1"
      style={{ color: "hsl(var(--text-200))" }}
    >
      {label}
    </label>
    <input
      id={id}
      name={id}
      type={type}
      autoComplete={autoComplete}
      required
      value={value}
      onChange={onChange}
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
      placeholder={placeholder}
    />
  </div>
);

// 에러 메시지 컴포넌트
const ErrorMessage = ({ message }) => (
  <div className="rounded-md p-4" style={{ backgroundColor: "hsl(var(--danger-100))" }}>
    <p className="text-sm" style={{ color: "hsl(var(--danger-000))" }}>
      {message}
    </p>
  </div>
);

// 제출 버튼 컴포넌트
const SubmitButton = ({ isLoading, text }) => (
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
    {text}
  </button>
);

export default LoginPresenter;