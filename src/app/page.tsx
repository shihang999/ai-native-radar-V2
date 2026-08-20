import { RadarChart } from "@/components/radar/RadarChart";
import { RankingSection } from "@/components/books/RankingSection";
import { DOMAINS, RINGS } from "@/lib/constants";
import { getResources } from "@/lib/api/resources";
import type { Resource } from "@/lib/database.types";
import type { Book } from "@/lib/constants";

function getSimulatedRingId(index: number, total: number): Book["ringId"] {
  if (total <= 1) return "beginner";

  const normalizedIndex = index / total;
  if (normalizedIndex < 1 / 3) return "beginner";
  if (normalizedIndex < 2 / 3) return "intermediate";
  return "advanced";
}

/**
 * 将 Resource 转换为 Book 类型
 */
function convertResourceToBook(resource: Resource, ringId: Book["ringId"]): Book {
  return {
    id: resource.id,
    title: resource.title,
    author: resource.author || "未知作者",
    domainId: resource.domain_id,
    ringId,
    rating: (resource.rating || 3) as 1 | 2 | 3 | 4 | 5,
    reason: resource.reason,
    coverImageUrl: resource.cover_image_url,
    resourceUrl: resource.resource_url,
  };
}

function convertResourcesToRadarBooks(resources: Resource[]): Book[] {
  const filtered = resources.filter((resource) => (resource.rating || 0) >= 4);
  const groupedByDomain = new Map<string, Resource[]>();

  filtered.forEach((resource) => {
    const group = groupedByDomain.get(resource.domain_id) || [];
    group.push(resource);
    groupedByDomain.set(resource.domain_id, group);
  });

  return Array.from(groupedByDomain.entries()).flatMap(([, domainResources]) => {
    const sorted = [...domainResources].sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      const publishedTimeDiff =
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (publishedTimeDiff !== 0) return publishedTimeDiff;

      return a.id.localeCompare(b.id);
    });

    return sorted.map((resource, index) =>
      convertResourceToBook(resource, getSimulatedRingId(index, sorted.length)),
    );
  });
}

/**
 * 首页（雷达主页）
 * 遵循 MVP 0.3.0 计划：简洁、聚焦雷达主视觉
 */
export default async function Home() {
  const resources = await getResources();
  const books = convertResourcesToRadarBooks(resources);
  const hasBooks = books.length > 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
      {/* Hero 区域 */}
      <section className="mb-12 max-w-[760px] snap-start pt-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#5DB2E2]">
          AI 学习认知地图
        </p>
        <h1 className="mb-5 text-4xl font-bold text-[#10213E]">
          AI-Native 读书雷达
        </h1>
        <p className="max-w-[680px] text-base leading-7 text-[#64748B]">
          这份雷达图把代表性书籍放入知识领域和学习阶段中，帮助你由浅入深建立各个业务领域的知识系统。
          <br />
          推荐资源：你可以推荐一本书/一门课程/一篇文章，推荐会先进入审核；通过后，可能会作为新的点位出现在雷达中。
        </p>
      </section>

      {/* 雷达主视觉区 - 一屏展示；xl 及以上为两列：左侧解读 + 右侧雷达放大占据剩余空间 */}
      <section className="mb-10 flex min-h-[calc(100svh-64px)] snap-start items-center justify-center">
        <div className="grid w-full gap-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start xl:justify-center">
          {/* 左侧：如何读这张雷达（含学习阶段） */}
          <aside className="order-2 xl:order-1">
            <h2 className="mb-3 text-sm font-semibold text-[#10213E]">
              如何读这张雷达
            </h2>
            <dl className="grid gap-3 text-xs leading-5">
              <div className="border-l-2 border-[#5DB2E2] pl-3">
                <dt className="font-semibold text-[#10213E]">颜色 = 知识领域</dt>
                <dd className="text-[#64748B]">不同颜色代表 AI 学习中的不同认知方向。</dd>
                <dd className="mt-2 grid gap-1">
                  {DOMAINS.map((domain) => (
                    <span key={domain.id} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: domain.color }}
                      />
                      <span className="text-[#64748B]">{domain.name}</span>
                    </span>
                  ))}
                </dd>
              </div>
              <div className="border-l-2 border-[#5DB2E2] pl-3">
                <dt className="font-semibold text-[#10213E]">圈层 = 学习阶段</dt>
                <dd className="text-[#64748B]">越靠外越偏进阶。</dd>
                <dd className="mt-2 grid gap-1">
                  {RINGS.map((ring, index) => (
                    <span key={ring.id} className="text-[#64748B]">
                      ·{["内层", "中层", "外层"][index] ?? ""}——{ring.name}：{ring.description}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="border-l-2 border-[#5DB2E2] pl-3">
                <dt className="font-semibold text-[#10213E]">点 = 代表性书籍</dt>
                <dd className="text-[#64748B]">每个点是一本文本样例，位置表达它的领域和阶段。</dd>
              </div>
            </dl>
          </aside>

          {/* 雷达：xl 下放大占据剩余空间，SVG 及其交互完整保留 */}
          <div className="order-1 mx-auto w-full max-w-[680px] xl:order-2 xl:max-w-[680px]">
            {hasBooks ? (
              <RadarChart books={books} />
            ) : (
              <div className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-8 py-14 text-center">
                <p className="text-base font-semibold text-[#10213E]">
                  当前暂无可展示的雷达点位
                </p>
                <p className="mt-3 text-sm leading-7 text-[#64748B]">
                  只有已审核且推荐指数 4 星及以上的资源会进入首页雷达。你可以先查看书单，或通过“推荐一本书”补充资源。
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 榜单推荐 */}
      <RankingSection />
    </div>
  );
}
