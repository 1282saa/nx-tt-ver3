import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import MainContent from "./components/MainContent";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import LandingPage from "./components/LandingPage";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // localStorage에서 상태 복원
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || "user";
  });
  const [selectedEngine, setSelectedEngine] = useState(() => {
    // 현재 경로에서 엔진 타입 추출
    if (location.pathname.includes('/t5')) return "T5";
    if (location.pathname.includes('/h8')) return "H8";
    // localStorage에서 복원
    return localStorage.getItem('selectedEngine') || "T5";
  });
  const [currentProject, setCurrentProject] = useState({
    title: "아키텍쳐",
    isStarred: false,
  });
  const [chatMessage, setChatMessage] = useState("");

  // 엔진 변경 시 프로젝트 제목 업데이트 및 localStorage 저장
  useEffect(() => {
    setCurrentProject(prev => ({
      ...prev,
      title: `${selectedEngine} 빠른 제목 생성`
    }));
    localStorage.setItem('selectedEngine', selectedEngine);
  }, [selectedEngine]);

  // 로그인 상태 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  // 사용자 역할 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('userRole', userRole);
  }, [userRole]);

  const toggleStar = () => {
    setCurrentProject((prev) => ({
      ...prev,
      isStarred: !prev.isStarred,
    }));
  };

  const handleStartChat = (message) => {
    setChatMessage(message);
    const enginePath = selectedEngine.toLowerCase();
    navigate(`/${enginePath}/chat`);
  };

  const handleBackToMain = () => {
    const enginePath = selectedEngine.toLowerCase();
    navigate(`/${enginePath}`);
    setChatMessage("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole("user");
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('selectedEngine');
    navigate("/");
  };

  const handleLogin = (role = "user") => {
    setIsLoggedIn(true);
    setUserRole(role);
    // location.state에서 엔진 정보 가져오기
    const engine = location.state?.engine || selectedEngine;
    setSelectedEngine(engine);
    const enginePath = engine.toLowerCase();
    navigate(`/${enginePath}`);
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    setCurrentProject((prev) => ({
      ...prev,
      title: `${engine} 빠른 제목 생성`,
    }));
    navigate("/login", { state: { engine } });
  };

  const handleSignUp = () => {
    setIsLoggedIn(true);
    const enginePath = selectedEngine.toLowerCase();
    navigate(`/${enginePath}`);
  };

  const handleGoToSignUp = () => {
    navigate("/signup");
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const handleBackToLanding = () => {
    navigate("/");
  };

  return (
    <div
      className="flex w-full overflow-x-clip"
      style={{
        minHeight: "100dvh",
        backgroundColor: "hsl(var(--bg-100))",
        color: "hsl(var(--text-100))",
      }}
    >
      <div className="min-h-full w-full min-w-0 flex-1">
        <Routes>
          <Route 
            path="/" 
            element={
              <LandingPage
                onSelectEngine={handleSelectEngine}
                onLogin={handleLogin}
              />
            } 
          />
          <Route 
            path="/login" 
            element={
              <LoginPage 
                onLogin={handleLogin} 
                onGoToSignUp={handleGoToSignUp}
                selectedEngine={location.state?.engine || selectedEngine}
              />
            } 
          />
          <Route 
            path="/signup" 
            element={
              <SignUpPage
                onSignUp={handleSignUp}
                onBackToLogin={handleBackToLogin}
              />
            } 
          />
          <Route 
            path="/t5" 
            element={
              <MainContent
                project={currentProject}
                userRole={userRole}
                selectedEngine="T5"
                onToggleStar={toggleStar}
                onStartChat={handleStartChat}
                onLogout={handleLogout}
                onBackToLanding={handleBackToLanding}
              />
            } 
          />
          <Route 
            path="/h8" 
            element={
              <MainContent
                project={currentProject}
                userRole={userRole}
                selectedEngine="H8"
                onToggleStar={toggleStar}
                onStartChat={handleStartChat}
                onLogout={handleLogout}
                onBackToLanding={handleBackToLanding}
              />
            } 
          />
          <Route 
            path="/t5/chat" 
            element={
              <ChatPage
                initialMessage={chatMessage}
                userRole={userRole}
                selectedEngine="T5"
                onBack={handleBackToMain}
                onLogout={handleLogout}
                onBackToLanding={handleBackToLanding}
              />
            } 
          />
          <Route 
            path="/h8/chat" 
            element={
              <ChatPage
                initialMessage={chatMessage}
                userRole={userRole}
                selectedEngine="H8"
                onBack={handleBackToMain}
                onLogout={handleLogout}
                onBackToLanding={handleBackToLanding}
              />
            } 
          />
          {/* 기본 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
