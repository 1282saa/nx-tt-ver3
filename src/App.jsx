import React, { useState } from "react";
import MainContent from "./components/MainContent";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import LandingPage from "./components/LandingPage";

function App() {
  const [currentPage, setCurrentPage] = useState("landing"); // 'landing' | 'main' | 'chat' | 'login' | 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("user"); // 'admin' | 'user'
  const [selectedEngine, setSelectedEngine] = useState("T5"); // 'T5' | 'H8'
  const [currentProject, setCurrentProject] = useState({
    title: "아키텍쳐",
    isStarred: false,
  });
  const [chatMessage, setChatMessage] = useState("");

  const toggleStar = () => {
    setCurrentProject((prev) => ({
      ...prev,
      isStarred: !prev.isStarred,
    }));
  };

  const handleStartChat = (message) => {
    setChatMessage(message);
    setCurrentPage("chat");
  };

  const handleBackToMain = () => {
    setCurrentPage("main");
    setChatMessage("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("landing");
  };

  const handleLogin = (role = "user") => {
    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentPage("main");
  };

  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    setCurrentProject((prev) => ({
      ...prev,
      title: `${engine} 빠른 제목 생성`,
    }));
    setCurrentPage("login");
  };

  const handleSignUp = () => {
    setIsLoggedIn(true);
    setCurrentPage("main");
  };

  const handleGoToSignUp = () => {
    setCurrentPage("signup");
  };

  const handleBackToLogin = () => {
    setCurrentPage("login");
  };

  const handleBackToLanding = () => {
    setCurrentPage("landing");
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
        {currentPage === "landing" ? (
          <LandingPage
            onSelectEngine={handleSelectEngine}
            onLogin={handleLogin}
          />
        ) : currentPage === "login" ? (
          <LoginPage onLogin={handleLogin} onGoToSignUp={handleGoToSignUp} />
        ) : currentPage === "signup" ? (
          <SignUpPage
            onSignUp={handleSignUp}
            onBackToLogin={handleBackToLogin}
          />
        ) : currentPage === "main" ? (
          <MainContent
            project={currentProject}
            userRole={userRole}
            selectedEngine={selectedEngine}
            onToggleStar={toggleStar}
            onStartChat={handleStartChat}
            onLogout={handleLogout}
            onBackToLanding={handleBackToLanding}
          />
        ) : (
          <ChatPage
            initialMessage={chatMessage}
            userRole={userRole}
            onBack={handleBackToMain}
            onLogout={handleLogout}
            onBackToLanding={handleBackToLanding}
          />
        )}
      </div>
    </div>
  );
}

export default App;
