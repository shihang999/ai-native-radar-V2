import { Suspense } from "react";
import { BookCard } from "@/components/books/BookCard";
import { FilterBar } from "@/components/books/FilterBar";
import { getResourcesWithFilters } from "@/lib/api/resources";

interface BooksPageProps {
  searchParams: Promise<{
    domain?: string;
    ring?: string;
    type?: string;
    q?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const listSearchParams = new URLSearchParams();
  if (params.domain) listSearchParams.set("domain", params.domain);
  if (params.ring) listSearchParams.set("ring", params.ring);
  if (params.type) listSearchParams.set("type", params.type);
  if (params.q) listSearchParams.set("q", params.q);
  const listQuery = listSearchParams.toString();
  const returnTo = listQuery ? `/books?${listQuery}` : "/books";

  // 获取筛选后的书单数据
  const filteredResources = await getResourcesWithFilters({
    domainId: params.domain,
    ringId: params.ring,
    resourceType: params.type as "book" | "course" | "article" | undefined,
    searchTerm: params.q,
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[#10213E]">书单</h1>
        <p className="text-base text-[#64748B]">
          探索精选书单，发现适合你的 AI 学习资源
        </p>
      </header>

      {/* 完整书单 */}
      <section>

        {/* 筛选栏 */}
        <Suspense fallback={<div className="mb-8 h-16 animate-pulse rounded-lg bg-[#F1F5F9]" />}>
          <FilterBar />
        </Suspense>

        {/* 书单网格 */}
        {filteredResources.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map((resource) => (
              <BookCard key={resource.id} resource={resource} returnTo={returnTo} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-16 w-16 text-[#CBD5E1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <p className="text-base font-medium text-[#10213E]">暂无符合条件的资源</p>
              <p className="mt-1 text-sm text-[#64748B]">
                {params.q ? "换个关键词试试，或清除搜索条件" : "尝试调整筛选条件或查看其他分类"}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}