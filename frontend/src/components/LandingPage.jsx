import React from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Sparkles } from "lucide-react";
import Header from "./Header";

const LandingPage = ({ onSelectEngine, onLogin, onLogout }) => {
  const navigate = useNavigate();

  const handleEngineSelect = (engine) => {
    onSelectEngine(engine);
  };

  const handleLogout = () => {
    // App.jsx의 handleLogout 호출
    if (onLogout) {
      onLogout();
    } else {
      // fallback: onLogout이 없으면 새로고침
      window.location.reload();
    }
  };

  return (
    <div
      className="h-screen transition-colors duration-300 overflow-hidden"
      style={{ backgroundColor: "hsl(var(--bg-100))" }}
    >
      {/* Header Component */}
      <Header
        onLogout={handleLogout}
        onAdminLogin={() => onLogin("admin")}
        onHome={() => window.location.reload()}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className="min-h-screen py-12 px-4"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--bg-100)) 0%, hsl(var(--bg-200)) 100%)",
          }}
        >
          <div className="container max-w-6xl mx-auto">
            {/* Main Header */}
            <div className="main-header text-center mb-12">
              <h1 className="app-title text-5xl font-bold mb-4">
                <span
                  className="bg-gradient-to-r bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, hsl(var(--accent-main-000)), hsl(var(--accent-secondary-000)))",
                  }}
                >
                  TITLE-HUB
                </span>
              </h1>
              <p className="app-subtitle text-xl text-text-300">
                서울경제신문 AI 제목 생성 시스템
              </p>
            </div>

            {/* Product Selection */}
            <div className="main-content">
              <div className="product-selection">
                <h2 className="selection-title text-2xl font-semibold text-center mb-8 text-text-100">
                  독자와의 첫 만남, 제목을 추천해 드립니다
                </h2>

                <div className="product-cards grid md:grid-cols-2 gap-8 mb-8">
                  {/* T5 Card */}
                  <div
                    className="product-card rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 p-6 border-2 border-transparent hover:border-accent-main-000"
                    style={{ backgroundColor: "hsl(var(--bg-000))" }}
                    onClick={() => handleEngineSelect("T5")}
                  >
                    <div className="card-header flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-accent-main-000" />
                        <div className="card-title text-3xl font-bold text-text-100">
                          T5
                        </div>
                      </div>
                      <div
                        className="card-badge px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: "hsl(var(--accent-main-000)/0.1)",
                          color: "hsl(var(--accent-main-000))",
                        }}
                      >
                        핵심을 꿰뚫는 타이틀
                      </div>
                    </div>

                    <div className="card-description text-text-300 mb-4">
                      5가지 유형별로 최적화된 제목을 8초 이내에 생성합니다.
                    </div>

                    <ul className="card-features space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-accent-main-000 mr-2">•</span>
                        <span className="text-text-200">
                          저널리즘 충실형 (신뢰도 중심)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-main-000 mr-2">•</span>
                        <span className="text-text-200">
                          균형잡힌 후킹형 (정보+호기심)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-main-000 mr-2">•</span>
                        <span className="text-text-200">
                          클릭유도형 (참여도 극대화)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-main-000 mr-2">•</span>
                        <span className="text-text-200">
                          SEO 최적화형 (검색 노출)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-main-000 mr-2">•</span>
                        <span className="text-text-200">
                          소셜미디어형 (바이럴 확산)
                        </span>
                      </li>
                    </ul>

                    <div className="mt-6 text-center">
                      <button
                        className="bg-accent-main-000 hover:bg-accent-main-100 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        onClick={() => handleEngineSelect("T5")}
                      >
                        T5 선택하기
                      </button>
                    </div>
                  </div>

                  {/* H8 Card */}
                  <div
                    className="product-card rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 p-6 border-2 border-transparent hover:border-accent-secondary-000"
                    style={{ backgroundColor: "hsl(var(--bg-000))" }}
                    onClick={() => handleEngineSelect("H8")}
                  >
                    <div className="card-header flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-accent-secondary-000" />
                        <div className="card-title text-3xl font-bold text-text-100">
                          H8
                        </div>
                      </div>
                      <div
                        className="card-badge px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor:
                            "hsl(var(--accent-secondary-000)/0.1)",
                          color: "hsl(var(--accent-secondary-000))",
                        }}
                      >
                        사방팔방 둘러보는 헤드라인
                      </div>
                    </div>

                    <div className="card-description text-text-300 mb-4">
                      8가지 유형별로 정교한 제목을 15초 이내에 생성합니다.
                    </div>

                    <ul className="card-features space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-accent-secondary-000 mr-2">
                          •
                        </span>
                        <span className="text-text-200">
                          간단명료형 + 5W1H형
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-secondary-000 mr-2">
                          •
                        </span>
                        <span className="text-text-200">
                          수식어활용형 + 스토리텔링형
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-secondary-000 mr-2">
                          •
                        </span>
                        <span className="text-text-200">
                          고정값활용형 + 위트한스푼형
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-accent-secondary-000 mr-2">
                          •
                        </span>
                        <span className="text-text-200">
                          부드러운문장형 + 대비되는상황형
                        </span>
                      </li>
                    </ul>

                    <div className="mt-6 text-center">
                      <button
                        className="bg-accent-secondary-000 hover:bg-accent-secondary-100 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        onClick={() => handleEngineSelect("H8")}
                      >
                        H8 선택하기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recommendation Text */}
                <div className="text-center text-text-300 text-sm">
                  💡 처음 사용하시는 분은{" "}
                  <strong className="text-accent-main-000">T5</strong>를
                  추천합니다 | 완벽한 결과가 필요하시면{" "}
                  <strong className="text-accent-secondary-000">H8</strong>을
                  선택하세요
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
