import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion } from 'framer-motion';
import MainContent from "./components/MainContent";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageTransition } from "./components/PageTransition";
import { AnimatePresence } from 'framer-motion';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarRef = useRef(null);

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
    console.log('🚀 handleStartChat called with:', message);
    // localStorage에 임시 저장 (페이지 전환 중 데이터 보존)
    localStorage.setItem('pendingMessage', message);
    setChatMessage(message);
    const enginePath = selectedEngine.toLowerCase();
    navigate(`/${enginePath}/chat`);
  };

  const handleBackToMain = () => {
    const enginePath = selectedEngine.toLowerCase();
    navigate(`/${enginePath}`);
    setChatMessage("");
  };

  const handleLogout = async () => {
    try {
      // Cognito 로그아웃
      const authService = (await import('./services/authService')).default;
      await authService.signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
    
    // 로컬 상태 및 스토리지 초기화
    setIsLoggedIn(false);
    setUserRole("user");
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('selectedEngine');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('authToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    
    // Header에 사용자 정보 업데이트 알림
    window.dispatchEvent(new CustomEvent('userInfoUpdated'));
    
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

  const handleTitleUpdate = (newTitle) => {
    setCurrentProject(prev => ({
      ...prev,
      title: newTitle
    }));
    console.log("📝 앱 제목 업데이트됨:", newTitle);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleNewConversation = () => {
    // 사이드바의 대화 목록 새로고침
    if (sidebarRef.current && sidebarRef.current.loadConversations) {
      sidebarRef.current.loadConversations();
    }
  };

  const handleDashboard = (engine) => {
    const enginePath = engine ? engine.toLowerCase() : selectedEngine.toLowerCase();
    navigate(`/${enginePath}/dashboard`);
  };

  const handleBackFromDashboard = (engine) => {
    const enginePath = engine ? engine.toLowerCase() : selectedEngine.toLowerCase();
    navigate(`/${enginePath}/chat`);
  };

  // 사이드바를 보여줄 페이지 확인 (랜딩, 로그인, 회원가입 제외)
  const showSidebar = !['/', '/login', '/signup'].includes(location.pathname);

  return (
    <div
      className="flex w-full overflow-x-clip"
      style={{
        minHeight: "100dvh",
        backgroundColor: "hsl(var(--bg-100))",
        color: "hsl(var(--text-100))",
      }}
    >
      {/* Sidebar - show on all pages except landing, login, signup */}
      {showSidebar && (
        <Sidebar 
          ref={sidebarRef}
          selectedEngine={selectedEngine}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />
      )}
      
      <motion.div 
        className="min-h-full w-full min-w-0 flex-1"
        animate={{ 
          marginLeft: showSidebar && isSidebarOpen ? 288 : 0 
        }}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 0.2
        }}
      >
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.split('/').slice(0, 3).join('/')}>
            <Route 
              path="/" 
              element={
                <PageTransition pageKey="landing">
                  <LandingPage
                    onSelectEngine={handleSelectEngine}
                    onLogin={handleLogin}
                  />
                </PageTransition>
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
              path="/t5/chat/:conversationId?" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="chat-t5">
                    <ChatPage
                      initialMessage={location.state?.initialMessage || chatMessage}
                      userRole={userRole}
                      selectedEngine="T5"
                      onLogout={handleLogout}
                      onBackToLanding={handleBackToLanding}
                      onTitleUpdate={handleTitleUpdate}
                      onToggleSidebar={toggleSidebar}
                      isSidebarOpen={isSidebarOpen}
                      onNewConversation={handleNewConversation}
                      onDashboard={() => handleDashboard("T5")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/h8/chat/:conversationId?" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="chat-h8">
                    <ChatPage
                      initialMessage={location.state?.initialMessage || chatMessage}
                      userRole={userRole}
                      selectedEngine="H8"
                      onLogout={handleLogout}
                      onBackToLanding={handleBackToLanding}
                      onTitleUpdate={handleTitleUpdate}
                      onToggleSidebar={toggleSidebar}
                      isSidebarOpen={isSidebarOpen}
                      onNewConversation={handleNewConversation}
                      onDashboard={() => handleDashboard("H8")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/t5" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="main-t5">
                    <MainContent
                      project={currentProject}
                      userRole={userRole}
                      selectedEngine="T5"
                      onToggleStar={toggleStar}
                      onStartChat={handleStartChat}
                      onLogout={handleLogout}
                      onBackToLanding={handleBackToLanding}
                      onToggleSidebar={toggleSidebar}
                      isSidebarOpen={isSidebarOpen}
                      onDashboard={() => handleDashboard("T5")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/h8" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="main-h8">
                    <MainContent
                      project={currentProject}
                      userRole={userRole}
                      selectedEngine="H8"
                      onToggleStar={toggleStar}
                      onStartChat={handleStartChat}
                      onLogout={handleLogout}
                      onBackToLanding={handleBackToLanding}
                      onToggleSidebar={toggleSidebar}
                      isSidebarOpen={isSidebarOpen}
                      onDashboard={() => handleDashboard("H8")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/t5/dashboard" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="dashboard-t5">
                    <Dashboard
                      selectedEngine="T5"
                      onBack={() => handleBackFromDashboard("T5")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/h8/dashboard" 
              element={
                <ProtectedRoute>
                  <PageTransition pageKey="dashboard-h8">
                    <Dashboard
                      selectedEngine="H8"
                      onBack={() => handleBackFromDashboard("H8")}
                    />
                  </PageTransition>
                </ProtectedRoute>
              } 
            />
            {/* 기본 리다이렉트 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </motion.div>
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
