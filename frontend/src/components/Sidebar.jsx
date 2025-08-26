import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Star,
  ChevronLeft,
  MoreHorizontal,
  User,
  X
} from 'lucide-react';
import { listConversations, deleteConversation } from '../services/conversationService';

const Sidebar = forwardRef(({ selectedEngine = 'T5', isOpen = true, onToggle }, ref) => {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, conversationId: null, title: '' });

  // 대화 목록 불러오기
  useEffect(() => {
    loadConversations();
  }, [selectedEngine]);
  
  // refreshSidebar 이벤트 리스너 추가
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 사이드바 새로고침 이벤트 수신');
      loadConversations();
    };
    
    window.addEventListener('refreshSidebar', handleRefresh);
    return () => window.removeEventListener('refreshSidebar', handleRefresh);
  }, [selectedEngine]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await listConversations(selectedEngine);
      
      console.log(`📊 사이드바 대화 목록 (${selectedEngine}):`, {
        totalCount: convs.length,
        first5: convs.slice(0, 5).map(c => ({
          id: c.conversationId,
          title: c.title,
          updatedAt: c.updatedAt,
          engineType: c.engineType
        }))
      });
      
      setConversations(convs);
      // localStorage에서 즐겨찾기 불러오기
      const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorites(savedFavorites);
    } catch (error) {
      console.error('대화 목록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // ref로 노출할 메서드
  useImperativeHandle(ref, () => ({
    loadConversations
  }));

  const toggleFavorite = (conversationId) => {
    const newFavorites = favorites.includes(conversationId)
      ? favorites.filter(id => id !== conversationId)
      : [...favorites, conversationId];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const handleDeleteClick = (conversationId, title) => {
    setDeleteModal({ open: true, conversationId, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.conversationId) return;
    
    try {
      await deleteConversation(deleteModal.conversationId);
      // 목록 즉시 새로고침
      await loadConversations();
      setDeleteModal({ open: false, conversationId: null, title: '' });
    } catch (error) {
      console.error('대화 삭제 실패:', error);
      // 에러가 발생해도 localStorage에서는 삭제되므로 목록 새로고침
      await loadConversations();
      setDeleteModal({ open: false, conversationId: null, title: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ open: false, conversationId: null, title: '' });
  };

  const favoriteConversations = conversations.filter(conv => 
    favorites.includes(conv.conversationId)
  );

  const recentConversations = conversations.filter(conv => 
    !favorites.includes(conv.conversationId)
  );

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={handleDeleteCancel}
          />
          
          {/* Modal */}
          <div className="relative flex flex-col focus:outline-none text-text-100 text-left shadow-xl 
            rounded-2xl p-6 align-middle bg-bg-100 
            min-w-0 w-full max-w-md animate-[zoom_250ms_ease-in_forwards]">
            <div className="min-h-full flex flex-col">
              <div className="flex items-center gap-4 justify-between">
                <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words">
                  <span className="[overflow-wrap:anywhere]">대화 삭제</span>
                </h2>
                <button
                  onClick={handleDeleteCancel}
                  className="p-1 rounded hover:bg-bg-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-1 mb-2">
                이 대화를 삭제하시겠습니까?
                {deleteModal.title && (
                  <div className="mt-2 text-sm text-text-300">
                    "{deleteModal.title}"
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="inline-flex items-center justify-center relative h-9 px-4 py-2 rounded-lg 
                    min-w-[5rem] text-text-100 font-medium 
                    bg-bg-300 hover:bg-bg-400 transition duration-100 active:scale-[0.985]"
                  type="button"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="inline-flex items-center justify-center relative h-9 px-4 py-2 rounded-lg 
                    min-w-[5rem] bg-red-600 text-white font-medium transition 
                    hover:bg-red-700 hover:scale-[1.02] active:scale-[0.985]"
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <motion.nav
        animate={{ 
          width: isOpen ? 288 : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 0.2
        }}
        className="h-screen flex flex-col gap-3 pb-2 px-0 fixed top-0 left-0
          shadow-lg bg-bg-200 z-50 overflow-hidden"
        aria-label="사이드바"
      >
        {/* Header */}
        <div className="flex w-full items-center gap-px p-2">
          <button
            onClick={onToggle}
            className="h-8 w-8 rounded-md hover:bg-bg-300 flex items-center justify-center transition-colors"
            aria-label="사이드바 닫기"
          >
            <ChevronLeft size={20} />
          </button>
        
        <Link to="/" className="flex items-center ml-2">
          <span className="text-xl font-semibold text-text-100">
            {selectedEngine === 'T5' ? 'T5' : 'H8'} Chat
          </span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="flex flex-col px-1.5 pt-0.5 gap-px mb-2">
        <button
          onClick={() => {
            // 현재 URL에서 conversationId 추출
            const pathParts = location.pathname.split('/');
            const conversationId = pathParts[pathParts.length - 1];
            
            // 현재 대화의 캐시만 삭제 (다른 대화는 유지)
            if (conversationId && conversationId !== 'chat') {
              const cacheKey = `conv:${conversationId}`;
              localStorage.removeItem(cacheKey);
              console.log(`🗑️ 현재 대화 캐시 삭제: ${cacheKey}`);
            }
            
            // 임시 데이터 정리
            localStorage.removeItem('pendingMessage');
            localStorage.removeItem('pendingConversationId');
            
            // sessionStorage 정리 (모든 processed 키 제거)
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('processed_')) {
                sessionStorage.removeItem(key);
              }
            });
            
            console.log("🔄 새 채팅 시작 - 이전 대화 기록 정리 완료");
            
            // 메인 페이지로 이동 (conversationId 없이)
            window.location.href = `/${selectedEngine.toLowerCase()}`;
          }}
          className="group flex items-center h-9 px-2.5 py-2 rounded-lg 
            hover:bg-accent-main-100/[0.08] active:bg-accent-main-100/[0.15]
            transition-all ease-in-out active:scale-[0.985] w-full text-left"
        >
          <div className="flex flex-row items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center rounded-full 
              bg-accent-main-100 group-hover:bg-accent-main-100 
              group-hover:shadow-md group-hover:scale-110 group-hover:-rotate-3
              group-active:rotate-6 group-active:scale-[0.98]
              transition-all ease-in-out">
              <Plus size={12} className="text-white group-hover:scale-105 transition" />
            </div>
            <span className="text-sm font-medium text-accent-main-100 tracking-tight">
              새 채팅
            </span>
          </div>
        </button>
      </div>

      {/* Conversation Lists */}
      <div className="flex flex-grow flex-col overflow-y-auto overflow-x-hidden relative px-2 mb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-main-100 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Favorites */}
            {favoriteConversations.length > 0 && (
              <div className="flex flex-col mb-6">
                <h3 className="text-text-300 pb-2 mt-1 text-xs select-none pl-2 sticky top-0 z-10 
                  bg-gradient-to-b from-bg-200 from-50% to-bg-200/40">
                  즐겨찾기
                </h3>
                <ul className="flex flex-col gap-px">
                  {favoriteConversations.map((conv) => (
                    <ConversationItem
                      key={conv.conversationId}
                      conversation={conv}
                      isActive={location.pathname.includes(conv.conversationId)}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(conv.conversationId)}
                      selectedEngine={selectedEngine}
                      loadConversations={loadConversations}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Recent */}
            <div className="flex flex-col">
              <h3 className="text-text-300 pb-2 mt-1 text-xs select-none pl-2 sticky top-0 z-10 
                bg-gradient-to-b from-bg-200 from-50% to-bg-200/40">
                최근 항목
              </h3>
              <ul className="flex flex-col gap-px">
                {recentConversations.length > 0 ? (
                  recentConversations.map((conv) => (
                    <ConversationItem
                      key={conv.conversationId}
                      conversation={conv}
                      isActive={location.pathname.includes(conv.conversationId)}
                      isFavorite={false}
                      onToggleFavorite={() => toggleFavorite(conv.conversationId)}
                      selectedEngine={selectedEngine}
                      loadConversations={loadConversations}
                      onDelete={handleDeleteClick}
                    />
                  ))
                ) : (
                  <li className="text-text-300 text-sm px-4 py-2">
                    대화가 없습니다
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* User Menu */}
      <div className="px-2 pb-1">
        <button
          className="flex items-center gap-3 w-full h-12 px-2 rounded-lg hover:bg-bg-300 transition-colors"
          type="button"
        >
          <div className="flex-shrink-0 flex size-8 items-center justify-center rounded-full bg-bg-400">
            <User size={16} className="text-text-300" />
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-sm font-medium text-text-100 truncate w-full text-left">
              사용자
            </span>
            <span className="text-xs text-text-300 truncate w-full text-left">
              {selectedEngine} Engine
            </span>
          </div>
        </button>
      </div>
      </motion.nav>
    </>
  );
});

// 대화 아이템 컴포넌트
const ConversationItem = ({ 
  conversation, 
  isActive, 
  isFavorite, 
  onToggleFavorite,
  selectedEngine,
  loadConversations,
  onDelete
}) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <li className="relative group">
      <Link
        to={`/${selectedEngine.toLowerCase()}/chat/${conversation.conversationId}`}
        className={`flex items-center gap-3 h-8 px-3 rounded-md text-xs
          hover:bg-bg-400 transition-colors relative
          ${isActive ? 'bg-bg-400 text-text-100' : 'text-text-300 hover:text-text-100'}`}
        onClick={() => {
          console.log("🔗 스레드 클릭:", {
            conversationId: conversation.conversationId,
            targetUrl: `/${selectedEngine.toLowerCase()}/chat/${conversation.conversationId}`,
            currentUrl: window.location.pathname
          });
        }}
      >
        {isFavorite && <Star size={12} className="flex-shrink-0 fill-current" />}
        <span className="truncate text-sm flex-1">
          {conversation.title || '제목 없음'}
        </span>
        
        {/* Options button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOptions(!showOptions);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity
            h-6 w-6 rounded flex items-center justify-center hover:bg-bg-300"
        >
          <MoreHorizontal size={14} />
        </button>
      </Link>

      {/* Options dropdown */}
      {showOptions && (
        <div className="absolute right-0 top-8 bg-bg-100 
          rounded-lg shadow-lg z-20 py-1 min-w-[150px]">
          <button
            onClick={() => {
              onToggleFavorite();
              setShowOptions(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-200 transition-colors"
          >
            {isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
          </button>
          <button
            onClick={() => {
              onDelete(conversation.conversationId, conversation.title);
              setShowOptions(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-200 transition-colors text-red-500"
          >
            삭제
          </button>
        </div>
      )}
    </li>
  );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;