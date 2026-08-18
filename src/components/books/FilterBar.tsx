"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DOMAINS, RINGS } from "@/lib/constants";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDomain = searchParams.get("domain") || "";
  const currentRing = searchParams.get("ring") || "";
  const currentType = searchParams.get("type") || "";
  const currentQuery = searchParams.get("q") || "";

  // 搜索输入本地态，防抖后同步到 URL 触发服务端搜索
  const [searchInput, setSearchInput] = useState(currentQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL 上的 q 变化时（如清除筛选）同步输入框
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/books?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateFilter("q", value.trim());
    }, 300);
  }

  function clearSearch() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchInput("");
    updateFilter("q", "");
  }

  function clearFilters() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchInput("");
    router.push("/books");
  }

  const hasFilters = currentDomain || currentRing || currentType || currentQuery;

  return (
    <div className="mb-8 space-y-4">
      {/* 搜索栏 */}
      <div className="relative">
        <label htmlFor="book-search" className="sr-only">
          搜索书单
        </label>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="book-search"
          type="search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="搜索书名、作者或推荐理由…"
          className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#10213E] placeholder:text-[#94A3B8] focus:border-[#5DB2E2] focus:outline-none focus:ring-1 focus:ring-[#5DB2E2]"
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            aria-label="清除搜索"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#10213E]"
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
          </button>
        )}
      </div>

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
          {currentQuery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10213E] px-3 py-1 text-xs font-medium text-white">
              搜索：{currentQuery}
              <button
                onClick={clearSearch}
                className="ml-1 hover:text-[#CBD5E1]"
                aria-label="移除搜索条件"
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