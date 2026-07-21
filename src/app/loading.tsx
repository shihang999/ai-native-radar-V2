/**
 * 加载状态组件
 * Next.js 15 自动使用此组件显示加载状态
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#5DB2E2] border-r-transparent" />
        <p className="text-sm text-[#64748B]">加载中...</p>
      </div>
    </div>
  );
}