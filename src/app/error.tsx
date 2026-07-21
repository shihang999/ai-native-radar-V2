"use client";

import { useEffect } from "react";

/**
 * 路由级别的错误处理组件
 * Next.js 15 必需组件
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 可以在这里记录错误到错误报告服务
    console.error("路由错误:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-[#10213E]">出错了</h2>
        <p className="mb-6 text-sm text-[#64748B]">{error.message || "发生了未知错误"}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-[#5DB2E2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8]"
        >
          重试
        </button>
      </div>
    </div>
  );
}