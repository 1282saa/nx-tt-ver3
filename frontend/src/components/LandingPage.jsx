import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Sparkles, ArrowRight, CheckCircle2, TrendingUp, Users, Shield } from "lucide-react";
import Header from "./Header";

const LandingPage = ({ onSelectEngine, onLogin, onLogout }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <div className="min-h-screen overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" />
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Header Component */}
      <Header
        onLogout={handleLogout}
        onAdminLogin={() => onLogin("admin")}
        onHome={() => window.location.reload()}
        isLandingPage={true}
      />

      {/* Main Content */}
      <main className="relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Section */}
            <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">AI 기반 제목 생성 플랫폼</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent animate-gradient">
                  TITLE-HUB
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-4">
                서울경제신문 AI 제목 생성 시스템
              </p>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                독자의 시선을 사로잡는 완벽한 헤드라인,
                <br />
                AI가 초 단위로 생성합니다
              </p>
            </div>

            {/* Stats Section */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">5초</div>
                <div className="text-sm text-gray-400">평균 생성 시간</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">98%</div>
                <div className="text-sm text-gray-400">정확도</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">13종</div>
                <div className="text-sm text-gray-400">제목 스타일</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-gray-400">상시 이용</div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="main-content">
              <div className="product-selection">
                <h2 className={`text-3xl font-bold text-center mb-12 text-white transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  당신의 콘텐츠에 맞는 AI 엔진을 선택하세요
                </h2>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  {/* T5 Card */}
                  <div
                    className={`relative group transition-all duration-500 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    onClick={() => handleEngineSelect("T5")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer hover:transform hover:scale-105 min-h-[500px] flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                            <Zap className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold text-white mb-1">T5</h3>
                            <p className="text-orange-400 text-sm font-medium">핵심을 꿰뚫는 타이틀</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                          <span className="text-xs text-orange-300">RECOMMENDED</span>
                        </div>
                      </div>

                      <p className="text-gray-300 mb-6">
                        5가지 핵심 스타일로 <span className="text-orange-400 font-semibold">8초 이내</span> 최적화된 제목 생성
                      </p>

                      <div className="space-y-3 mb-6 flex-grow">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">저널리즘 충실형 (신뢰도 중심)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">균형잡힌 후킹형 (정보+호기심)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">클릭유도형 (참여도 극대화)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">SEO 최적화형 (검색 노출)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">소셜미디어형 (바이럴 확산)</span>
                        </div>
                      </div>

                      <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 group mt-auto">
                        T5 선택하기
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* H8 Card */}
                  <div
                    className={`relative group transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    onClick={() => handleEngineSelect("H8")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer hover:transform hover:scale-105 min-h-[500px] flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                            <Sparkles className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold text-white mb-1">H8</h3>
                            <p className="text-blue-400 text-sm font-medium">사방팔방 둘러보는 헤드라인</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                          <span className="text-xs text-blue-300">PREMIUM</span>
                        </div>
                      </div>

                      <p className="text-gray-300 mb-6">
                        8가지 다양한 스타일로 <span className="text-blue-400 font-semibold">15초 이내</span> 정교한 제목 생성
                      </p>

                      <div className="space-y-3 mb-6 flex-grow">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">간단명료형 + 5W1H형</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">수식어활용형 + 스토리텔링형</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">고정값활용형 + 위트한스푼형</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">부드러운문장형 + 대비되는상황형</span>
                        </div>
                      </div>

                      <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 group mt-auto">
                        H8 선택하기
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className={`grid md:grid-cols-3 gap-6 mt-16 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl mb-4">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">CTR 35% 향상</h3>
                    <p className="text-sm text-gray-400">AI 최적화 제목으로 클릭률 대폭 상승</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl mb-4">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">100+ 언론사 사용</h3>
                    <p className="text-sm text-gray-400">검증된 성능과 신뢰성</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">언론 윤리 준수</h3>
                    <p className="text-sm text-gray-400">저널리즘 가치를 지키는 AI</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </main>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        .animate-gradient {
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
