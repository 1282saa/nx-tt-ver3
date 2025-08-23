import React, { useState, useEffect } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import clsx from "clsx";

const TitleSuggestions = ({ titles, onSelectTitle, isLoading }) => {
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (titles.length > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [titles]);

  const handleTitleClick = (title, index) => {
    setSelectedTitle(index);
    setTimeout(() => {
      onSelectTitle(title);
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="mb-6 p-4 bg-bg-100 rounded-xl border border-border-300/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent-main-000 animate-pulse" />
          <span className="text-sm font-medium text-text-200">제목 생성 중...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 bg-bg-200 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!titles || titles.length === 0) {
    return null;
  }

  return (
    <div 
      className={clsx(
        "mb-6 p-4 bg-bg-100 rounded-xl border border-border-300/20 transition-all duration-300",
        isAnimating && "animate-in slide-in-from-top-2 fade-in"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent-main-000" />
        <span className="text-sm font-medium text-text-200">제목 추천</span>
      </div>
      
      <div className="space-y-2">
        {titles.map((title, index) => (
          <button
            key={index}
            onClick={() => handleTitleClick(title, index)}
            disabled={selectedTitle !== null}
            className={clsx(
              "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group",
              "hover:bg-bg-200 focus:bg-bg-200 focus:outline-none",
              selectedTitle === index
                ? "bg-accent-main-000 text-white"
                : selectedTitle !== null
                ? "opacity-50 cursor-not-allowed"
                : "bg-bg-000 hover:bg-bg-200 text-text-100"
            )}
          >
            <span className="text-sm font-medium line-clamp-1 mr-2">
              {title}
            </span>
            <ChevronRight 
              className={clsx(
                "h-4 w-4 transition-transform duration-200",
                selectedTitle === index
                  ? "text-white"
                  : "text-text-400 group-hover:text-text-200",
                "group-hover:translate-x-1"
              )} 
            />
          </button>
        ))}
      </div>
      
      <p className="text-xs text-text-500 mt-3">
        클릭하여 대화의 제목을 설정하세요
      </p>
    </div>
  );
};

export default TitleSuggestions;