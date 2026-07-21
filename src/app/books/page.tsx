import { Suspense } from "react";
import { BookCard } from "@/components/books/BookCard";
import { FilterBar } from "@/components/books/FilterBar";
import { RankingCard } from "@/components/books/RankingCard";
import {
  getResourcesWithFilters,
  getNewThisWeek,
  getHotThisMonth,
  getMostViewed,
  getTopRated,
} from "@/lib/api/resources";
import type { Resource } from "@/lib/database.types";

// 榜单图标
const NewIcon = () => (
  <svg className="h-4 w-4 text-[#5DB2E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HotIcon = () => (
  <svg className="h-4 w-4 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.997 7.997 0 0120 14a7.997 7.997 0 01-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const InspireIcon = () => (
  <svg className="h-4 w-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

interface BooksPageProps {
  searchParams: Promise<{
    domain?: string;
    ring?: string;
    type?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;

  // 并行获取所有数据
  const [filteredResources, newThisWeek, hotThisMonth, mostViewed, topRated] = await Promise.all([
    getResourcesWithFilters({
      domainId: params.domain,
      ringId: params.ring,
      resourceType: params.type as "book" | "course" | "article" | undefined,
    }),
    getNewThisWeek(),
    getHotThisMonth(),
    getMostViewed(),
    getTopRated(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[#10213E]">书单 / 榜单</h1>
        <p className="text-base text-[#64748B]">
          探索精选书单和热门榜单，发现适合你的 AI 学习资源
        </p>
      </header>

      {/* 榜单区 */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-[#10213E]">榜单推荐</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <RankingCard
            title="本周上新"
            icon={<NewIcon />}
            color="#5DB2E2"
            resources={newThisWeek}
            emptyText="暂无新资源"
          />
          <RankingCard
            title="本月最火"
            icon={<HotIcon />}
            color="#EC4899"
            resources={hotThisMonth}
          />
          <RankingCard
            title="观看最多"
            icon={<ViewIcon />}
            color="#7C3AED"
            resources={mostViewed}
          />
          <RankingCard
            title="Inspire Top 10"
            icon={<InspireIcon />}
            color="#F59E0B"
            resources={topRated}
          />
        </div>
      </section>

      {/* 完整书单 */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-[#10213E]">完整书单</h2>

        {/* 筛选栏 */}
        <Suspense fallback={<div className="mb-8 h-16 animate-pulse rounded-lg bg-[#F1F5F9]" />}>
          <FilterBar />
        </Suspense>

        {/* 书单网格 */}
        {filteredResources.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map((resource) => (
              <BookCard key={resource.id} resource={resource} />
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
              <p className="mt-1 text-sm text-[#64748B]">尝试调整筛选条件或查看其他分类</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}