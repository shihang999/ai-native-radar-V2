import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getResourceById, getRelatedResources, recordView } from "@/lib/api/resources";
import { getDomainById, getRingById } from "@/lib/constants";
import { BookCover } from "@/components/books/BookCover";
import { ExistingResourceReviewButton } from "@/components/books/ExistingResourceReviewButton";

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

function getBookListReturnPath(returnTo?: string): string | null {
  if (returnTo === "/books" || returnTo?.startsWith("/books?")) {
    return returnTo;
  }
  return null;
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

export default async function BookDetailPage({ params, searchParams }: BookDetailPageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const bookListReturnPath = getBookListReturnPath(returnTo);
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
          href={bookListReturnPath ?? "/"}
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
          {bookListReturnPath ? "返回书单" : "返回雷达"}
        </Link>

        {/* 主内容区 */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* 左侧：封面和基础信息 */}
          <div className="space-y-6">
            {/* 封面大图：DB 封面 > Open Library（按 ISBN）> 本地占位图 */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-lg">
              <BookCover
                coverImageUrl={resource.cover_image_url}
                isbn={resource.isbn}
                title={resource.title}
                size="L"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 380px"
                priority
              />
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
                <div className="flex gap-4">
                  <dt className="w-20 shrink-0 text-[#64748B]">资料链接</dt>
                  <dd className="min-w-0 text-[#10213E]">
                    {resource.resource_url ? (
                      <a
                        href={resource.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5DB2E2] hover:underline break-all"
                      >
                        {resource.resource_url}
                      </a>
                    ) : (
                      <span className="text-[#94A3B8]">无</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 推荐信息 */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[#10213E]">推荐信息</h2>
                <ExistingResourceReviewButton
                  resource={{
                    id: resource.id,
                    title: resource.title,
                    author: resource.author,
                    resource_type: resource.resource_type,
                    resource_url: resource.resource_url,
                    domain_id: resource.domain_id,
                    ring_id: resource.ring_id,
                  }}
                />
              </div>

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
