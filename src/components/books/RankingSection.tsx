import { RankingCard } from "@/components/books/RankingCard";
import {
  getNewThisWeek,
  getTrendingThisWeek,
  getTopRated,
} from "@/lib/api/resources";
import { RANKING_HISTORY } from "@/lib/mock/ranking-history";

// 榜单图标
const NewIcon = () => (
  <svg className="h-4 w-4 text-[#5DB2E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="h-4 w-4 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const InspireIcon = () => (
  <svg className="h-4 w-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

/**
 * 榜单推荐模块：本周上新 / 本周热门 / Inspire Top 10（总榜，放最后）
 * 每个榜单右上角提供「历史榜单」入口，可查看过去各期快照。
 */
export async function RankingSection() {
  const [newThisWeek, trendingThisWeek, topRated] = await Promise.all([
    getNewThisWeek(),
    getTrendingThisWeek(),
    getTopRated(),
  ]);

  return (
    <section className="mb-12 snap-start border-t border-[#E2E8F0] pt-10">
      <h2 className="mb-6 text-xl font-semibold text-[#10213E]">榜单推荐</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <RankingCard
          title="本周上新"
          icon={<NewIcon />}
          color="#5DB2E2"
          resources={newThisWeek}
          history={RANKING_HISTORY["new-this-week"]}
          emptyText="暂无新资源"
        />
        <RankingCard
          title="本周热门"
          icon={<TrendingIcon />}
          color="#EC4899"
          resources={trendingThisWeek}
          history={RANKING_HISTORY["trending-this-week"]}
          emptyText="暂无热门推荐"
        />
        <RankingCard
          title="Inspire Top 10"
          icon={<InspireIcon />}
          color="#F59E0B"
          resources={topRated}
          history={RANKING_HISTORY["top-rated"]}
        />
      </div>

      {/* 品牌区：雷达产品图标 + 名称，下方保留一段留白 */}
      <div className="mt-8 flex flex-col items-center gap-2 border-t border-[#F1F5F9] pt-6 pb-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10213E]">
            <span className="text-sm font-bold text-white">AI</span>
          </div>
          <span className="text-base font-semibold text-[#10213E]">AI-Native 读书雷达</span>
        </div>
      </div>
    </section>
  );
}
