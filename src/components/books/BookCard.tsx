"use client";

import Link from "next/link";
import type { Resource } from "@/lib/database.types";
import { DOMAINS, getDomainById } from "@/lib/constants";
import { BookCover } from "@/components/books/BookCover";

interface BookCardProps {
  resource: Resource;
  returnTo?: string;
}

export function BookCard({ resource, returnTo }: BookCardProps) {
  const domain = getDomainById(resource.domain_id);
  const rating = resource.rating || 3;
  const detailHref = returnTo
    ? { pathname: `/books/${resource.id}`, query: { returnTo } }
    : `/books/${resource.id}`;

  return (
    <Link href={detailHref} className="group">
      <article className="h-full rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#CBD5E1] hover:shadow-lg">
        {/* 封面图：DB 封面 > Open Library（按 ISBN）> 本地占位图 */}
        <div className="relative mb-4 aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#F1F5F9]">
          <BookCover
            coverImageUrl={resource.cover_image_url}
            isbn={resource.isbn}
            title={resource.title}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* 内容 */}
        <div className="space-y-2">
          {/* 书名 */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[#10213E] group-hover:text-[#5DB2E2]">
            {resource.title}
          </h3>

          {/* 作者 */}
          {resource.author && (
            <p className="text-xs text-[#64748B]">{resource.author}</p>
          )}

          {/* 推荐指数 */}
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= rating ? "text-[#F59E0B]" : "text-[#E2E8F0]"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>

          {/* 领域标签 */}
          {domain && (
            <div className="flex flex-wrap gap-1.5">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-[#10213E]"
                style={{
                  backgroundColor: `${domain.color}15`,
                  borderLeft: `3px solid ${domain.color}`,
                }}
              >
                {domain.name}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}