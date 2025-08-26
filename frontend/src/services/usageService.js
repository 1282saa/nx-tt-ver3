// 사용량 추적 서비스 (DynamoDB 연동)
import { API_BASE_URL } from '../config';

// Usage API 전용 엔드포인트 (DynamoDB 연동)
const USAGE_API_BASE_URL = 'https://qyfams2iva.execute-api.us-east-1.amazonaws.com/prod';

// 사용자 정보 가져오기 헬퍼 함수
const getCurrentUser = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return {
      userId: userInfo.email || userInfo.username || 'anonymous',
      plan: localStorage.getItem('userRole') === 'admin' ? 'premium' : 'free'
    };
  } catch (error) {
    console.error('사용자 정보 파싱 실패:', error);
    return { userId: 'anonymous', plan: 'free' };
  }
};

// 인증 헤더 생성
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// 플랜별 제한 설정 (서버에서 가져올 수도 있음)
const PLAN_LIMITS = {
  free: {
    T5: {
      monthlyTokens: 10000,
      dailyMessages: 20,
      maxTokensPerMessage: 1000
    },
    H8: {
      monthlyTokens: 10000,
      dailyMessages: 20,
      maxTokensPerMessage: 1000
    }
  },
  basic: {
    T5: {
      monthlyTokens: 100000,
      dailyMessages: 100,
      maxTokensPerMessage: 2000
    },
    H8: {
      monthlyTokens: 100000,
      dailyMessages: 100,
      maxTokensPerMessage: 2000
    }
  },
  premium: {
    T5: {
      monthlyTokens: 500000,
      dailyMessages: 500,
      maxTokensPerMessage: 4000
    },
    H8: {
      monthlyTokens: 500000,
      dailyMessages: 500,
      maxTokensPerMessage: 4000
    }
  }
};

// 토큰 계산 유틸리티 (간단한 추정치)
export const estimateTokens = (text) => {
  if (!text) return 0;
  
  // 한글: 평균 2-3자당 1토큰
  // 영어: 평균 4자당 1토큰
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const otherChars = text.length - koreanChars - englishChars;
  
  const koreanTokens = Math.ceil(koreanChars / 2.5);
  const englishTokens = Math.ceil(englishChars / 4);
  const otherTokens = Math.ceil(otherChars / 3);
  
  return koreanTokens + englishTokens + otherTokens;
};

// 글자 수 계산
export const countCharacters = (text) => {
  return text ? text.length : 0;
};

// 로컬 스토리지 키
const USAGE_KEY = 'user_usage_data';
const USER_PROFILE_KEY = 'user_profile';

// 사용자 프로필 가져오기
export const getUserProfile = () => {
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) {
      // 기본값 (서버에서 가져와야 함)
      return {
        userId: localStorage.getItem('userId') || 'anonymous',
        currentPlan: 'free',
        signupDate: new Date().toISOString(),
        planStartDate: new Date().toISOString()
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('프로필 로드 실패:', error);
    return {
      currentPlan: 'free'
    };
  }
};

// 사용자 플랜 설정
export const setUserPlan = (plan) => {
  const profile = getUserProfile();
  profile.currentPlan = plan;
  profile.planStartDate = new Date().toISOString();
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

// 사용량 데이터 초기화
const initializeUsageData = () => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const userProfile = getUserProfile();
  const planLimits = PLAN_LIMITS[userProfile.currentPlan] || PLAN_LIMITS.free;
  
  return {
    T5: {
      period: currentMonth,
      planType: userProfile.currentPlan,
      tokens: {
        input: 0,
        output: 0,
        total: 0
      },
      characters: {
        input: 0,
        output: 0
      },
      messageCount: 0,
      dailyUsage: {
        [today]: {
          tokens: 0,
          messages: 0
        }
      },
      limits: planLimits.T5,
      firstUsedAt: null,
      lastUsedAt: null
    },
    H8: {
      period: currentMonth,
      planType: userProfile.currentPlan,
      tokens: {
        input: 0,
        output: 0,
        total: 0
      },
      characters: {
        input: 0,
        output: 0
      },
      messageCount: 0,
      dailyUsage: {
        [today]: {
          tokens: 0,
          messages: 0
        }
      },
      limits: planLimits.H8,
      firstUsedAt: null,
      lastUsedAt: null
    }
  };
};

// 로컬 사용량 데이터 가져오기
export const getLocalUsageData = () => {
  try {
    // 먼저 백업 데이터 확인 (실제 사용량)
    const backup = localStorage.getItem(USAGE_KEY + '_backup');
    if (backup) {
      try {
        const backupData = JSON.parse(backup);
        // 백업 데이터가 있으면 우선 사용
        return backupData;
      } catch (e) {
        console.log('백업 데이터 파싱 실패');
      }
    }
    
    const stored = localStorage.getItem(USAGE_KEY);
    if (!stored) {
      // 초기화하되, 기존 백업 데이터가 있는지 한 번 더 확인
      const existingBackup = localStorage.getItem(USAGE_KEY + '_backup');
      if (existingBackup) {
        return JSON.parse(existingBackup);
      }
      
      const initialData = initializeUsageData();
      localStorage.setItem(USAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    
    const data = JSON.parse(stored);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // 월이 바뀌었으면 초기화
    if (data.T5?.period !== currentMonth) {
      const newData = initializeUsageData();
      localStorage.setItem(USAGE_KEY, JSON.stringify(newData));
      return newData;
    }
    
    // 플랜 변경 체크 및 제한 업데이트
    const userProfile = getUserProfile();
    const planLimits = PLAN_LIMITS[userProfile.currentPlan] || PLAN_LIMITS.free;
    
    if (data.T5) {
      data.T5.planType = userProfile.currentPlan;
      data.T5.limits = planLimits.T5;
    }
    if (data.H8) {
      data.H8.planType = userProfile.currentPlan;
      data.H8.limits = planLimits.H8;
    }
    
    return data;
  } catch (error) {
    console.error('사용량 데이터 로드 실패:', error);
    return initializeUsageData();
  }
};

// 사용량 제한 체크
export const checkUsageLimit = (engineType, additionalTokens = 0) => {
  const usageData = getLocalUsageData();
  const engine = usageData[engineType];
  const today = new Date().toISOString().slice(0, 10);
  
  if (!engine) return { allowed: false, reason: '잘못된 엔진 타입' };
  
  // 월간 토큰 제한 체크
  if (engine.tokens.total + additionalTokens > engine.limits.monthlyTokens) {
    return {
      allowed: false,
      reason: '월간 토큰 한도 초과',
      remaining: Math.max(0, engine.limits.monthlyTokens - engine.tokens.total)
    };
  }
  
  // 일일 메시지 제한 체크
  const todayUsage = engine.dailyUsage[today] || { messages: 0 };
  if (todayUsage.messages >= engine.limits.dailyMessages) {
    return {
      allowed: false,
      reason: '일일 메시지 한도 초과',
      dailyRemaining: 0
    };
  }
  
  // 메시지당 토큰 제한 체크
  if (additionalTokens > engine.limits.maxTokensPerMessage) {
    return {
      allowed: false,
      reason: '메시지당 토큰 한도 초과',
      maxAllowed: engine.limits.maxTokensPerMessage
    };
  }
  
  return {
    allowed: true,
    remaining: engine.limits.monthlyTokens - engine.tokens.total,
    dailyRemaining: engine.limits.dailyMessages - todayUsage.messages
  };
};

// 사용량 업데이트 (DynamoDB API 호출)
export const updateLocalUsage = async (engineType, inputText, outputText) => {
  try {
    const user = getCurrentUser();
    
    console.log(`📊 ${engineType} 사용량 업데이트 시도:`, {
      userId: user.userId,
      inputLength: inputText?.length || 0,
      outputLength: outputText?.length || 0
    });
    
    // DynamoDB API 호출
    const response = await fetch(`${USAGE_API_BASE_URL}/usage/update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userId: user.userId,
        engineType: engineType,
        inputText: inputText || '',
        outputText: outputText || '',
        userPlan: user.plan
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${engineType} 사용량 업데이트 성공:`, {
        tokensUsed: result.tokensUsed,
        percentage: result.percentage,
        remaining: result.remaining
      });
      
      // 로컬 백업용으로 저장 (오프라인 대비)
      const backupData = getLocalUsageData();
      if (result.usage) {
        // API 응답의 사용량 데이터를 로컬 형식으로 변환
        backupData[engineType] = {
          period: result.usage.yearMonth || new Date().toISOString().slice(0, 7),
          planType: result.usage.userPlan || user.plan,
          tokens: {
            input: result.usage.inputTokens || 0,
            output: result.usage.outputTokens || 0,
            total: result.usage.totalTokens || 0
          },
          characters: {
            input: result.usage.characters?.input || 0,
            output: result.usage.characters?.output || 0
          },
          messageCount: result.usage.messageCount || 0,
          dailyUsage: result.usage.dailyUsage || {},
          limits: result.usage.limits || PLAN_LIMITS[user.plan]?.[engineType] || PLAN_LIMITS.free[engineType],
          firstUsedAt: result.usage.createdAt || result.usage.firstUsedAt,
          lastUsedAt: result.usage.lastUsedAt || result.usage.updatedAt
        };
        
        // 로컬 스토리지 업데이트
        localStorage.setItem(USAGE_KEY, JSON.stringify(backupData));
        localStorage.setItem(USAGE_KEY + '_backup', JSON.stringify(backupData));
      }
      
      // 실제 퍼센티지 계산 (API 응답 기반)
      const actualPercentage = result.percentage !== undefined ? 
        result.percentage : 
        Math.round((result.usage?.totalTokens || 0) / (result.usage?.limits?.monthlyTokens || 500000) * 100);
      
      return {
        success: true,
        percentage: actualPercentage,
        remaining: result.remaining,
        usage: result.usage
      };
    } else {
      console.warn(`⚠️ ${engineType} 사용량 제한:`, result.error);
      return {
        success: false,
        reason: result.error,
        remaining: result.remaining || 0
      };
    }
    
  } catch (error) {
    console.error('사용량 업데이트 실패:', error);
    
    // API 실패 시 로컬 백업 사용
    console.log('🔄 로컬 백업으로 전환');
    return updateLocalUsageBackup(engineType, inputText, outputText);
  }
};

// API 실패 시 로컬 백업 함수
const updateLocalUsageBackup = (engineType, inputText, outputText) => {
  try {
    const usageData = getLocalUsageData();
    const engine = usageData[engineType];
    const today = new Date().toISOString().slice(0, 10);
    
    if (!engine) {
      console.error(`잘못된 엔진 타입: ${engineType}`);
      return { success: false, reason: '잘못된 엔진 타입' };
    }
    
    // 토큰 및 글자 수 계산
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(outputText);
    const totalTokens = inputTokens + outputTokens;
    const inputChars = countCharacters(inputText);
    const outputChars = countCharacters(outputText);
    
    // 사용량 제한 체크
    const limitCheck = checkUsageLimit(engineType, totalTokens);
    if (!limitCheck.allowed) {
      return {
        success: false,
        reason: limitCheck.reason,
        ...limitCheck
      };
    }
    
    // 토큰 업데이트
    engine.tokens.input += inputTokens;
    engine.tokens.output += outputTokens;
    engine.tokens.total += totalTokens;
    
    // 글자 수 업데이트
    engine.characters.input += inputChars;
    engine.characters.output += outputChars;
    
    // 메시지 카운트 업데이트
    engine.messageCount += 1;
    
    // 일일 사용량 업데이트
    if (!engine.dailyUsage[today]) {
      engine.dailyUsage[today] = { tokens: 0, messages: 0 };
    }
    engine.dailyUsage[today].tokens += totalTokens;
    engine.dailyUsage[today].messages += 1;
    
    // 시간 업데이트
    const now = new Date().toISOString();
    if (!engine.firstUsedAt) {
      engine.firstUsedAt = now;
    }
    engine.lastUsedAt = now;
    
    // 로컬 백업 저장
    localStorage.setItem(USAGE_KEY + '_backup', JSON.stringify(usageData));
    
    console.log(`💾 ${engineType} 로컬 백업 업데이트:`, {
      inputTokens,
      outputTokens,
      totalTokens: engine.tokens.total
    });
    
    return {
      success: true,
      usage: engine,
      percentage: getUsagePercentage(engineType),
      remaining: limitCheck.remaining,
      isBackup: true
    };
  } catch (error) {
    console.error('로컬 백업 업데이트 실패:', error);
    return { success: false, reason: '업데이트 실패' };
  }
};

// 사용량 퍼센티지 계산
export const getUsagePercentage = (engineType) => {
  const usageData = getLocalUsageData();
  const engine = usageData[engineType];
  
  if (!engine || !engine.limits) return 0;
  
  const percentage = Math.round((engine.tokens.total / engine.limits.monthlyTokens) * 100);
  return Math.min(percentage, 100); // 100% 초과 방지
};

// 사용량 요약 정보 가져오기
export const getUsageSummary = (engineType) => {
  const usageData = getLocalUsageData();
  const engine = usageData[engineType];
  const today = new Date().toISOString().slice(0, 10);
  
  if (!engine) return null;
  
  const todayUsage = engine.dailyUsage[today] || { tokens: 0, messages: 0 };
  
  return {
    // 퍼센티지
    percentage: getUsagePercentage(engineType),
    
    // 토큰 정보
    tokens: {
      used: engine.tokens.total,
      limit: engine.limits.monthlyTokens,
      remaining: Math.max(0, engine.limits.monthlyTokens - engine.tokens.total),
      input: engine.tokens.input,
      output: engine.tokens.output
    },
    
    // 글자 수 정보
    characters: {
      input: engine.characters.input,
      output: engine.characters.output,
      total: engine.characters.input + engine.characters.output
    },
    
    // 메시지 정보
    messages: {
      total: engine.messageCount,
      todayCount: todayUsage.messages,
      todayLimit: engine.limits.dailyMessages,
      todayRemaining: Math.max(0, engine.limits.dailyMessages - todayUsage.messages)
    },
    
    // 플랜 정보
    plan: {
      type: engine.planType,
      limits: engine.limits
    },
    
    // 시간 정보
    period: engine.period,
    lastUsed: engine.lastUsedAt,
    firstUsed: engine.firstUsedAt
  };
};

// 모든 엔진의 사용량 통계 가져오기
export const getAllUsageStats = () => {
  const usageData = getLocalUsageData();
  const userProfile = getUserProfile();
  
  return {
    user: {
      userId: userProfile.userId,
      plan: userProfile.currentPlan,
      signupDate: userProfile.signupDate,
      planStartDate: userProfile.planStartDate
    },
    engines: {
      T5: getUsageSummary('T5'),
      H8: getUsageSummary('H8')
    },
    total: {
      tokens: {
        total: (usageData.T5?.tokens.total || 0) + (usageData.H8?.tokens.total || 0),
        input: (usageData.T5?.tokens.input || 0) + (usageData.H8?.tokens.input || 0),
        output: (usageData.T5?.tokens.output || 0) + (usageData.H8?.tokens.output || 0)
      },
      characters: {
        input: (usageData.T5?.characters.input || 0) + (usageData.H8?.characters.input || 0),
        output: (usageData.T5?.characters.output || 0) + (usageData.H8?.characters.output || 0)
      },
      messages: (usageData.T5?.messageCount || 0) + (usageData.H8?.messageCount || 0)
    }
  };
};

// 서버에서 사용량 데이터 가져오기 (API 호출)
export const fetchUsageFromServer = async (userId, engineType) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${USAGE_API_BASE_URL}/usage/${userId}/${engineType}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('사용량 데이터 조회 실패');
    }
    
    const data = await response.json();
    
    // 로컬 스토리지와 동기화
    const localData = getLocalUsageData();
    localData[engineType] = {
      ...localData[engineType],
      ...data
    };
    localStorage.setItem(USAGE_KEY, JSON.stringify(localData));
    
    return data;
  } catch (error) {
    console.error('서버 사용량 조회 실패:', error);
    return getLocalUsageData()[engineType];
  }
};

// 서버에 사용량 업데이트 (API 호출)
export const updateUsageOnServer = async (userId, engineType, usageData) => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${USAGE_API_BASE_URL}/usage/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        engineType,
        ...usageData
      })
    });
    
    if (!response.ok) {
      throw new Error('사용량 업데이트 실패');
    }
    
    return await response.json();
  } catch (error) {
    console.error('서버 사용량 업데이트 실패:', error);
    return null;
  }
};

// 플랜 변경
export const changePlan = async (newPlan) => {
  try {
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('userId');
    
    // 서버에 플랜 변경 요청
    const response = await fetch(`${USAGE_API_BASE_URL}/user/plan`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        newPlan,
        changeDate: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('플랜 변경 실패');
    }
    
    // 로컬 프로필 업데이트
    setUserPlan(newPlan);
    
    // 사용량 데이터 리셋 (선택적)
    const usageData = getLocalUsageData();
    localStorage.setItem(USAGE_KEY, JSON.stringify(usageData));
    
    return await response.json();
  } catch (error) {
    console.error('플랜 변경 실패:', error);
    return null;
  }
};

// 사용량 초기화 (월별 리셋)
export const resetMonthlyUsage = () => {
  const initialData = initializeUsageData();
  localStorage.setItem(USAGE_KEY, JSON.stringify(initialData));
  return initialData;
};

// Dashboard에서 사용하는 전체 사용량 데이터 가져오기 (DynamoDB API)
export const getAllUsageData = async () => {
  try {
    const user = getCurrentUser();
    
    console.log(`📊 전체 사용량 데이터 조회: ${user.userId}`);
    
    // T5와 H8 각각 호출
    const [t5Response, h8Response] = await Promise.all([
      fetch(`${USAGE_API_BASE_URL}/usage/${encodeURIComponent(user.userId)}/T5`, {
        method: 'GET',
        headers: getAuthHeaders()
      }),
      fetch(`${USAGE_API_BASE_URL}/usage/${encodeURIComponent(user.userId)}/H8`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
    ]);
    
    const t5Result = await t5Response.json();
    const h8Result = await h8Response.json();
    
    console.log('📊 T5 응답:', t5Result);
    console.log('📊 H8 응답:', h8Result);
    
    // 엔진별 데이터 정리
    const t5Data = t5Result.success ? t5Result.data : null;
    const h8Data = h8Result.success ? h8Result.data : null;
    
    // 대시보드 호환 형식으로 변환
    return {
      userId: user.userId,
      userPlan: user.plan,
      signupDate: new Date().toISOString(),
      T5: {
        monthlyTokensUsed: t5Data?.totalTokens || 0,
        inputTokens: t5Data?.inputTokens || 0,
        outputTokens: t5Data?.outputTokens || 0,
        charactersProcessed: 0, // 간단화
        messageCount: t5Data?.messageCount || 0,
        lastUsedAt: t5Data?.lastUsedAt,
        limits: PLAN_LIMITS[user.plan]?.T5 || PLAN_LIMITS.free.T5
      },
      H8: {
        monthlyTokensUsed: h8Data?.totalTokens || 0,
        inputTokens: h8Data?.inputTokens || 0,
        outputTokens: h8Data?.outputTokens || 0,
        charactersProcessed: 0, // 간단화
        messageCount: h8Data?.messageCount || 0,
        lastUsedAt: h8Data?.lastUsedAt,
        limits: PLAN_LIMITS[user.plan]?.H8 || PLAN_LIMITS.free.H8
      }
    };
    
  } catch (error) {
    console.error('사용량 데이터 조회 실패:', error);
    // 오류 시 기본값 반환
    const user = getCurrentUser();
    return {
      userId: user.userId,
      userPlan: user.plan,
      signupDate: new Date().toISOString(),
      T5: {
        monthlyTokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        charactersProcessed: 0,
        messageCount: 0,
        lastUsedAt: null,
        limits: PLAN_LIMITS[user.plan]?.T5 || PLAN_LIMITS.free.T5
      },
      H8: {
        monthlyTokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        charactersProcessed: 0,
        messageCount: 0,
        lastUsedAt: null,
        limits: PLAN_LIMITS[user.plan]?.H8 || PLAN_LIMITS.free.H8
      }
    };
  }
};

// 플랜별 제한 가져오기
export const getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

export default {
  estimateTokens,
  countCharacters,
  getUserProfile,
  setUserPlan,
  getLocalUsageData,
  checkUsageLimit,
  updateLocalUsage,
  getUsagePercentage,
  getUsageSummary,
  getAllUsageStats,
  fetchUsageFromServer,
  updateUsageOnServer,
  changePlan,
  resetMonthlyUsage,
  getAllUsageData,
  getPlanLimits,
  PLAN_LIMITS
};