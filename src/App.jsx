import React, { useState } from "react";
import MainContent from "./components/MainContent";
import ChatPage from "./components/ChatPage";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";

function App() {
  const [currentPage, setCurrentPage] = useState("main"); // 'main' | 'chat' | 'login' | 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userRole, setUserRole] = useState("admin"); // 'admin' | 'user'
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
    setCurrentPage("login");
  };

  const handleLogin = (role = "user") => {
    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentPage("main");
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
        {currentPage === "login" ? (
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
            onToggleStar={toggleStar}
            onStartChat={handleStartChat}
            onLogout={handleLogout}
          />
        ) : (
          <ChatPage
            initialMessage={chatMessage}
            userRole={userRole}
            onBack={handleBackToMain}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;
