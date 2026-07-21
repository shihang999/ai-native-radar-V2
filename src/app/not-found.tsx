import Link from "next/link";

/**
 * 404 页面
 * Next.js 15 自动使用此组件显示 404 状态
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-[#10213E]">页面不存在</h2>
        <p className="mb-6 text-sm text-[#64748B]">无法找到您访问的页面</p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[#5DB2E2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8]"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}