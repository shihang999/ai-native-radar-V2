"use client";

import { useState } from "react";

/**
 * 全局浮动推荐按钮
 * 遵循 UX 设计规范：右下角固定位置，不遮挡主要内容
 */
export function FloatingButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-8 right-6 z-40 md:bottom-24">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-[#10213E] px-3 py-2 text-xs text-white shadow-lg">
          推荐一本书
        </div>
      )}

      {/* 按钮 */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("openRecommendDrawer"));
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5DB2E2] text-white shadow-lg transition hover:bg-[#4A9FD8] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#5DB2E2] focus:ring-offset-2"
        aria-label="推荐一本书"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}