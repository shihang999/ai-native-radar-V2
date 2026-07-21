"use client";

import Image from "next/image";
import Link from "next/link";
import type { Resource } from "@/lib/database.types";
import { DOMAINS, getDomainById } from "@/lib/constants";

interface BookCardProps {
  resource: Resource;
}

export function BookCard({ resource }: BookCardProps) {
  const domain = getDomainById(resource.domain_id);
  const rating = resource.rating || 3;

  return (
    <Link href={`/books/${resource.id}`} className="group">
      <article className="h-full rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#CBD5E1] hover:shadow-lg">
        {/* 封面图 */}
        <div className="relative mb-4 aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#F1F5F9]">
          {resource.cover_image_url ? (
            <Image
              src={resource.cover_image_url}
              alt={resource.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-12 w-12 text-[#CBD5E1]"
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
            </div>
          )}
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