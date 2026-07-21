"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DOMAINS, RINGS } from "@/lib/constants";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDomain = searchParams.get("domain") || "";
  const currentRing = searchParams.get("ring") || "";
  const currentType = searchParams.get("type") || "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/books?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/books");
  }

  const hasFilters = currentDomain || currentRing || currentType;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 领域筛选 */}
        <div className="min-w-[160px]">
          <label htmlFor="domain-filter" className="sr-only">
            选择领域
          </label>
          <select
            id="domain-filter"
            value={currentDomain}
            onChange={(e) => updateFilter("domain", e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#10213E] focus:border-[#5DB2E2] focus:outline-none focus:ring-1 focus:ring-[#5DB2E2]"
          >
            <option value="">全部领域</option>
            {DOMAINS.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        {/* 圈层筛选 */}
        <div className="min-w-[140px]">
          <label htmlFor="ring-filter" className="sr-only">
            选择圈层
          </label>
          <select
            id="ring-filter"
            value={currentRing}
            onChange={(e) => updateFilter("ring", e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#10213E] focus:border-[#5DB2E2] focus:outline-none focus:ring-1 focus:ring-[#5DB2E2]"
          >
            <option value="">全部圈层</option>
            {RINGS.map((ring) => (
              <option key={ring.id} value={ring.id}>
                {ring.name}
              </option>
            ))}
          </select>
        </div>

        {/* 类型筛选 */}
        <div className="min-w-[140px]">
          <label htmlFor="type-filter" className="sr-only">
            选择类型
          </label>
          <select
            id="type-filter"
            value={currentType}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#10213E] focus:border-[#5DB2E2] focus:outline-none focus:ring-1 focus:ring-[#5DB2E2]"
          >
            <option value="">全部类型</option>
            <option value="book">书籍</option>
            <option value="course">课程</option>
            <option value="article">文章</option>
          </select>
        </div>

        {/* 清除筛选 */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 py-2 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#E2E8F0] hover:text-[#10213E]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            清除筛选
          </button>
        )}
      </div>

      {/* 已选筛选标签 */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {currentDomain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#5DB2E2] px-3 py-1 text-xs font-medium text-white">
              {DOMAINS.find((d) => d.id === currentDomain)?.name}
              <button
                onClick={() => updateFilter("domain", "")}
                className="ml-1 hover:text-[#E0F2FE]"
                aria-label="移除领域筛选"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
          {currentRing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-medium text-white">
              {RINGS.find((r) => r.id === currentRing)?.name}
              <button
                onClick={() => updateFilter("ring", "")}
                className="ml-1 hover:text-[#EDE9FE]"
                aria-label="移除圈层筛选"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
          {currentType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#059669] px-3 py-1 text-xs font-medium text-white">
              {currentType === "book"
                ? "书籍"
                : currentType === "course"
                  ? "课程"
                  : "文章"}
              <button
                onClick={() => updateFilter("type", "")}
                className="ml-1 hover:text-[#D1FAE5]"
                aria-label="移除类型筛选"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}