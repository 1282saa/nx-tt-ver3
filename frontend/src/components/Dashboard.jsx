import React, { useState, useEffect } from "react";
import { Calendar, TrendingUp, Clock, Package, BarChart, Activity, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import usageService from "../services/usageService";

const Dashboard = ({ selectedEngine = "T5", onBack }) => {
  const navigate = useNavigate();
  const [usageData, setUsageData] = useState(null);
  const [timeRange, setTimeRange] = useState("month"); // month, week, day

  useEffect(() => {
    loadUsageData();
    
    // localStorage 변경 감지 (다른 탭에서 사용량 업데이트 시)
    const handleStorageChange = (e) => {
      if (e.key === 'user_usage_data') {
        loadUsageData();
      }
    };
    
    // 사용량 업데이트 커스텀 이벤트 리스너
    const handleUsageUpdate = () => {
      loadUsageData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('usageUpdated', handleUsageUpdate);
    
    // 5초마다 자동 새로고침 (실시간 반영)
    const interval = setInterval(loadUsageData, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usageUpdated', handleUsageUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadUsageData = async () => {
    try {
      console.log('🔄 대시보드 사용량 데이터 로딩...');
      const data = await usageService.getAllUsageData();
      setUsageData(data);
      console.log('✅ 대시보드 사용량 데이터 로딩 완료:', data);
    } catch (error) {
      console.error('❌ 대시보드 사용량 데이터 로딩 실패:', error);
    }
  };

  const handleBack = () => {
    // 브라우저 히스토리가 있으면 뒤로가기, 없으면 채팅 페이지로 이동
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // 새 채팅 화면으로 이동
      const enginePath = selectedEngine.toLowerCase();
      navigate(`/${enginePath}/chat`);
    }
  };

  if (!usageData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-300">데이터 로딩 중...</div>
      </div>
    );
  }

  const engineData = usageData[selectedEngine] || {
    monthlyTokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    charactersProcessed: 0
  };
  const percentage = usageService.getUsagePercentage(selectedEngine) || 0;
  const planLimits = usageService.getPlanLimits(usageData.userPlan);
  const currentPlanLimits = planLimits[selectedEngine] || {
    monthlyTokens: 10000,
    monthlyCharacters: 100000,
    dailyTokens: 1000,
    dailyCharacters: 10000
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getUsageBarColor = (percent) => {
    if (percent > 80) return "bg-red-500";
    if (percent > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const planColors = {
    free: "bg-gray-500",
    basic: "bg-blue-500",
    premium: "bg-purple-500",
  };

  const planLabels = {
    free: "무료",
    basic: "베이직",
    premium: "프리미엄",
  };

  return (
    <div className="min-h-screen bg-bg-000">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-100/95 backdrop-blur-md border-b border-bg-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-bg-200 transition-colors"
                aria-label="뒤로가기"
              >
                <ChevronLeft size={20} className="text-text-300" />
              </button>
              <h1 className="text-xl font-semibold text-text-100">{selectedEngine} 사용량 대시보드</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded text-sm font-medium bg-accent-main-000 text-white">
                {selectedEngine} 엔진
              </span>
              <span className={clsx(
                "px-3 py-1 rounded-full text-sm font-medium text-white",
                planColors[usageData.userPlan]
              )}>
                {planLabels[usageData.userPlan]} 플랜
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-100 rounded-lg p-4 border border-bg-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-300 text-sm">총 토큰 사용량</span>
              <Activity size={16} className="text-text-400" />
            </div>
            <div className="text-2xl font-semibold text-text-100">
              {formatNumber(engineData.monthlyTokensUsed)}
            </div>
            <div className="text-xs text-text-400 mt-1">
              / {formatNumber(currentPlanLimits.monthlyTokens)}
            </div>
          </div>

          <div className="bg-bg-100 rounded-lg p-4 border border-bg-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-300 text-sm">입력 토큰</span>
              <TrendingUp size={16} className="text-text-400" />
            </div>
            <div className="text-2xl font-semibold text-text-100">
              {formatNumber(engineData.inputTokens)}
            </div>
            <div className="text-xs text-text-400 mt-1">
              {engineData.inputTokens + engineData.outputTokens > 0 
                ? ((engineData.inputTokens / (engineData.inputTokens + engineData.outputTokens)) * 100).toFixed(1) 
                : 0}%
            </div>
          </div>

          <div className="bg-bg-100 rounded-lg p-4 border border-bg-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-300 text-sm">출력 토큰</span>
              <BarChart size={16} className="text-text-400" />
            </div>
            <div className="text-2xl font-semibold text-text-100">
              {formatNumber(engineData.outputTokens)}
            </div>
            <div className="text-xs text-text-400 mt-1">
              {engineData.inputTokens + engineData.outputTokens > 0 
                ? ((engineData.outputTokens / (engineData.inputTokens + engineData.outputTokens)) * 100).toFixed(1) 
                : 0}%
            </div>
          </div>

          <div className="bg-bg-100 rounded-lg p-4 border border-bg-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-300 text-sm">문자 수</span>
              <Package size={16} className="text-text-400" />
            </div>
            <div className="text-2xl font-semibold text-text-100">
              {formatNumber(engineData.charactersProcessed)}
            </div>
            <div className="text-xs text-text-400 mt-1">
              / {formatNumber(currentPlanLimits.monthlyCharacters)}
            </div>
          </div>
        </div>

        {/* Usage Progress */}
        <div className="bg-bg-100 rounded-lg p-6 border border-bg-300 mb-6">
          <h2 className="text-lg font-semibold text-text-100 mb-4">월간 사용량</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-text-300">토큰 사용률</span>
                <span className="text-sm font-medium text-text-100">{percentage.toFixed(1)}%</span>
              </div>
              <div className="relative h-3 bg-bg-200 rounded-full overflow-hidden">
                <div
                  className={clsx("absolute left-0 top-0 h-full transition-all duration-500", getUsageBarColor(percentage))}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-text-300">문자 사용률</span>
                <span className="text-sm font-medium text-text-100">
                  {currentPlanLimits.monthlyCharacters > 0 
                    ? ((engineData.charactersProcessed / currentPlanLimits.monthlyCharacters) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="relative h-3 bg-bg-200 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "absolute left-0 top-0 h-full transition-all duration-500",
                    getUsageBarColor(currentPlanLimits.monthlyCharacters > 0 
                      ? (engineData.charactersProcessed / currentPlanLimits.monthlyCharacters) * 100
                      : 0)
                  )}
                  style={{
                    width: `${Math.min(
                      currentPlanLimits.monthlyCharacters > 0 
                        ? (engineData.charactersProcessed / currentPlanLimits.monthlyCharacters) * 100
                        : 0, 
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-100 rounded-lg p-6 border border-bg-300">
            <h2 className="text-lg font-semibold text-text-100 mb-4">사용자 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-300">사용자 ID</span>
                <span className="text-text-100 font-medium">{usageData.userId || "ttrhtt12"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">가입일</span>
                <span className="text-text-100">{formatDate(usageData.signupDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">현재 플랜</span>
                <span className={clsx(
                  "px-2 py-1 rounded text-xs font-medium text-white",
                  planColors[usageData.userPlan]
                )}>
                  {planLabels[usageData.userPlan]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">플랜 변경일</span>
                <span className="text-text-100">{formatDate(usageData.lastPlanChange)}</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-100 rounded-lg p-6 border border-bg-300">
            <h2 className="text-lg font-semibold text-text-100 mb-4">플랜 제한</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-300">월간 토큰</span>
                <span className="text-text-100 font-medium">
                  {formatNumber(currentPlanLimits.monthlyTokens)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">월간 문자</span>
                <span className="text-text-100 font-medium">
                  {formatNumber(currentPlanLimits.monthlyCharacters)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">일일 토큰</span>
                <span className="text-text-100 font-medium">
                  {formatNumber(currentPlanLimits.dailyTokens)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-300">일일 문자</span>
                <span className="text-text-100 font-medium">
                  {formatNumber(currentPlanLimits.dailyCharacters)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Information */}
        <div className="mt-6 p-4 bg-bg-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-text-400" />
            <span className="text-sm text-text-300">
              다음 사용량 초기화: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;