import React from "react";
import clsx from "clsx";

// 기본 스켈레톤 박스 컴포넌트
export const SkeletonBox = ({ className, animate = true }) => {
  return (
    <div
      className={clsx(
        "bg-bg-200 rounded",
        animate && "animate-pulse",
        className
      )}
    />
  );
};

// 텍스트 라인 스켈레톤
export const SkeletonText = ({ lines = 1, className, animate = true }) => {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "h-4 bg-bg-200 rounded",
            animate && "animate-pulse",
            i === lines - 1 && lines > 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
};

// 채팅 메시지 스켈레톤
export const ChatMessageSkeleton = ({ isUser = false }) => {
  return (
    <div className={clsx("flex gap-3 mb-6", isUser ? "flex-row-reverse" : "")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-bg-200 animate-pulse flex-shrink-0" />
      )}
      <div className={clsx("max-w-2xl", isUser ? "ml-auto" : "")}>
        <div
          className={clsx(
            "p-4 rounded-lg",
            isUser
              ? "bg-accent-main-000/10"
              : "bg-bg-100 border border-bg-300"
          )}
        >
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
};

// 채팅 페이지 전체 스켈레톤
export const ChatPageSkeleton = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 bg-bg-100/95 backdrop-blur-md border-b border-bg-300">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <SkeletonBox className="w-10 h-10 rounded-md" />
              <SkeletonBox className="w-32 h-6" />
            </div>
            <div className="flex items-center space-x-4">
              <SkeletonBox className="w-24 h-8 rounded-lg" />
              <SkeletonBox className="w-8 h-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <ChatMessageSkeleton isUser={true} />
          <ChatMessageSkeleton isUser={false} />
          <ChatMessageSkeleton isUser={true} />
          <ChatMessageSkeleton isUser={false} />
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="border-t border-bg-300 p-4">
        <div className="max-w-3xl mx-auto">
          <SkeletonBox className="w-full h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// 메인 컨텐츠 페이지 스켈레톤
export const MainContentSkeleton = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 bg-bg-100/95 backdrop-blur-md border-b border-bg-300">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <SkeletonBox className="w-10 h-10 rounded-md" />
              <SkeletonBox className="w-32 h-6" />
            </div>
            <div className="flex items-center space-x-4">
              <SkeletonBox className="w-24 h-8 rounded-lg" />
              <SkeletonBox className="w-8 h-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Title Skeleton */}
          <div className="text-center mb-8">
            <SkeletonBox className="w-64 h-10 mx-auto mb-4" />
            <SkeletonBox className="w-96 h-6 mx-auto" />
          </div>

          {/* Guide Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 rounded-lg bg-bg-100 border border-bg-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <SkeletonBox className="w-8 h-8 rounded" />
                  <div className="flex-1">
                    <SkeletonBox className="w-32 h-5 mb-2" />
                    <SkeletonText lines={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area Skeleton */}
          <div className="relative">
            <SkeletonBox className="w-full h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

// 사이드바 스켈레톤
export const SidebarSkeleton = () => {
  return (
    <div className="w-72 h-full bg-bg-100 border-r border-bg-300 p-4">
      {/* New Chat Button Skeleton */}
      <SkeletonBox className="w-full h-10 rounded-lg mb-6" />
      
      {/* Conversation List Skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg">
            <SkeletonBox className="w-full h-5 mb-2" />
            <SkeletonBox className="w-3/4 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 랜딩 페이지 스켈레톤
export const LandingPageSkeleton = () => {
  return (
    <div className="h-screen bg-bg-100">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 bg-bg-100/95 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <SkeletonBox className="w-32 h-8" />
            <div className="flex items-center space-x-4">
              <SkeletonBox className="w-24 h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <SkeletonBox className="w-96 h-12 mx-auto mb-4" />
          <SkeletonBox className="w-64 h-6 mx-auto" />
        </div>

        {/* Engine Cards Skeleton */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-bg-000 border border-bg-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <SkeletonBox className="w-10 h-10 rounded" />
                  <SkeletonBox className="w-16 h-8" />
                </div>
                <SkeletonBox className="w-32 h-6 rounded-full" />
              </div>
              <SkeletonText lines={2} className="mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <SkeletonBox key={j} className="w-full h-4" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default {
  SkeletonBox,
  SkeletonText,
  ChatMessageSkeleton,
  ChatPageSkeleton,
  MainContentSkeleton,
  SidebarSkeleton,
  LandingPageSkeleton,
};