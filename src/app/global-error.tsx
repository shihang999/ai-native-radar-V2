"use client";

/**
 * 全局错误处理组件
 * Next.js 15 必需组件
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF]">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-[#10213E]">发生严重错误</h2>
            <p className="mb-6 text-sm text-[#64748B]">应用程序遇到了无法恢复的错误</p>
            <button
              onClick={reset}
              className="rounded-lg bg-[#5DB2E2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8]"
            >
              重新加载
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}