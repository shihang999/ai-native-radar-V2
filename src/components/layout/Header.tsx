"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * 全局导航栏组件
 * 遵循 MASTER.md 设计系统：企业级、专业感、结构清晰
 */
export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "雷达", isActive: pathname === "/" },
    { href: "/books", label: "书单", isActive: pathname.startsWith("/books") },
    // { href: "/about", label: "关于", isActive: pathname === "/about" }, // 可选
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo 区域 */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10213E]">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <span className="hidden text-lg font-semibold text-[#10213E] sm:block">
              AI-Native 读书雷达
            </span>
          </Link>
        </div>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                item.isActive
                  ? "text-[#5DB2E2]"
                  : "text-[#10213E] hover:text-[#5DB2E2]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 推荐按钮（桌面端） */}
        <div className="hidden md:block">
          <button
            onClick={() => {
              // 触发推荐抽屉（后续实现）
              window.dispatchEvent(new CustomEvent("openRecommendDrawer"));
            }}
            className="rounded-lg bg-[#5DB2E2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5DB2E2] focus:ring-offset-2"
          >
            推荐一本书
          </button>
        </div>

        {/* 移动端汉堡菜单 */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#F5F5F6] md:hidden"
          aria-label="打开菜单"
        >
          <svg
            className="h-5 w-5 text-[#10213E]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="border-t border-[#E2E8F0] bg-white md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                  item.isActive
                    ? "bg-[#5DB2E2]/10 text-[#5DB2E2]"
                    : "text-[#10213E] hover:bg-[#F5F5F6]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.dispatchEvent(new CustomEvent("openRecommendDrawer"));
              }}
              className="mt-2 rounded-lg bg-[#5DB2E2] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A9FD8]"
            >
              推荐一本书
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}