import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getResourceById, getRelatedResources, recordView } from "@/lib/api/resources";
import { getDomainById, getRingById } from "@/lib/constants";
import { RatingSection } from "@/components/books/RatingSection";

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResourceById(id);

  if (!resource) {
    return {
      title: "资源未找到 - AI-Native 读书雷达",
    };
  }

  return {
    title: `${resource.title} - AI-Native 读书雷达`,
    description: resource.reason,
  };
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params;
  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  // 记录浏览（异步执行，不阻塞渲染）
  recordView(id).catch(console.error);

  // 获取领域和圈层信息
  const domain = getDomainById(resource.domain_id);
  const ring = getRingById(resource.ring_id);

  // 获取相关资源
  const relatedResources = await getRelatedResources(
    id,
    resource.domain_id,
    resource.ring_id,
    4
  );

  return (
    <div className="min-h-screen bg-[#F5F5F6]">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {/* 返回按钮 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5DB2E2] transition hover:text-[#4A9FD8] mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回雷达
        </Link>

        {/* 主内容区 */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* 左侧：封面和基础信息 */}
          <div className="space-y-6">
            {/* 封面大图 */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-lg">
              {resource.cover_image_url ? (
                <Image
                  src={resource.cover_image_url}
                  alt={resource.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 380px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#E2E8F0] to-[#F5F5F6]">
                  <div className="text-center">
                    <div className="mb-2 text-6xl font-bold text-[#CBD5E1]">
                      {resource.title.charAt(0)}
                    </div>
                    <p className="text-sm text-[#94A3B8]">暂无封面</p>
                  </div>
                </div>
              )}
            </div>

            {/* 用户评分区 */}
            <RatingSection resourceId={id} />

            {/* 浏览次数 */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold text-[#10213E]">浏览统计</h3>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[#64748B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span className="text-sm text-[#64748B]">
                  <span className="font-semibold text-[#10213E]">{resource.view_count}</span> 次浏览
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：详细信息 */}
          <div className="space-y-6">
            {/* 标签：领域和圈层 */}
            <div className="flex flex-wrap items-center gap-2">
              {domain && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium" style={{
                  backgroundColor: `${domain.color}15`,
                  color: domain.color,
                }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: domain.color }} />
                  {domain.name}
                </span>
              )}
              {ring && (
                <span className="rounded-full bg-[#E2E8F0] px-3 py-1.5 text-sm font-medium text-[#10213E]">
                  {ring.name}
                </span>
              )}
            </div>

            {/* 书名 */}
            <h1 className="text-3xl font-bold text-[#10213E]">{resource.title}</h1>

            {/* 基础元信息 */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#10213E]">基础信息</h2>
              <dl className="grid gap-3 text-sm">
                {resource.author && (
                  <div className="flex gap-4">
                    <dt className="w-20 shrink-0 text-[#64748B]">作者</dt>
                    <dd className="text-[#10213E]">{resource.author}</dd>
                  </div>
                )}
                {resource.publisher && (
                  <div className="flex gap-4">
                    <dt className="w-20 shrink-0 text-[#64748B]">出版社</dt>
                    <dd className="text-[#10213E]">{resource.publisher}</dd>
                  </div>
                )}
                {resource.published_year && (
                  <div className="flex gap-4">
                    <dt className="w-20 shrink-0 text-[#64748B]">出版年份</dt>
                    <dd className="text-[#10213E]">{resource.published_year}</dd>
                  </div>
                )}
                {resource.isbn && (
                  <div className="flex gap-4">
                    <dt className="w-20 shrink-0 text-[#64748B]">ISBN</dt>
                    <dd className="text-[#10213E]">{resource.isbn}</dd>
                  </div>
                )}
                {resource.resource_url && (
                  <div className="flex gap-4">
                    <dt className="w-20 shrink-0 text-[#64748B]">资料链接</dt>
                    <dd>
                      <a
                        href={resource.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5DB2E2] hover:underline"
                      >
                        查看详情
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* 推荐信息 */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#10213E]">推荐信息</h2>

              {/* 推荐指数 */}
              <div>
                <dt className="mb-2 text-sm text-[#64748B]">推荐指数</dt>
                <dd className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${
                          i < (resource.rating || 3) ? "text-[#E63946]" : "text-[#E2E8F0]"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#10213E]">
                    {resource.rating || 3}/5
                  </span>
                </dd>
              </div>

              {/* 推荐理由 */}
              <div>
                <dt className="mb-2 text-sm text-[#64748B]">推荐理由</dt>
                <dd className="text-sm leading-6 text-[#10213E]">{resource.reason}</dd>
              </div>

              {/* 推荐人 */}
              {resource.recommender && (
                <div>
                  <dt className="mb-2 text-sm text-[#64748B]">推荐人</dt>
                  <dd className="text-sm text-[#10213E]">{resource.recommender}</dd>
                </div>
              )}
            </div>

            {/* 学习路径指引 */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#10213E]">学习路径指引</h2>

              {ring && (
                <div className="rounded-lg bg-[#F5F5F6] p-4">
                  <p className="text-sm font-medium text-[#10213E] mb-1">
                    当前阶段：{ring.name}
                  </p>
                  <p className="text-sm text-[#64748B]">{ring.description}</p>
                </div>
              )}

              {domain && (
                <div className="rounded-lg bg-[#F5F5F6] p-4">
                  <p className="text-sm font-medium text-[#10213E] mb-1">
                    所属领域：{domain.name}
                  </p>
                  <p className="text-sm text-[#64748B]">{domain.description}</p>
                </div>
              )}
            </div>

            {/* 下一步推荐 */}
            {relatedResources.length > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#10213E]">相关推荐</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {relatedResources.map((relResource) => (
                    <Link
                      key={relResource.id}
                      href={`/books/${relResource.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-[#E2E8F0] p-3 transition hover:border-[#5DB2E2] hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#10213E] group-hover:text-[#5DB2E2] transition line-clamp-1">
                          {relResource.title}
                        </p>
                        {relResource.author && (
                          <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                            {relResource.author}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}