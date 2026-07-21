"use client";

import Link from "next/link";
import type { Resource } from "@/lib/database.types";
import { getDomainById } from "@/lib/constants";

interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  resources: Resource[];
  emptyText?: string;
}

export function RankingCard({
  title,
  icon,
  color,
  resources,
  emptyText = "暂无数据",
}: RankingCardProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      {/* 标题 */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>
        <h3 className="text-base font-semibold text-[#10213E]">{title}</h3>
      </div>

      {/* 列表 */}
      {resources.length > 0 ? (
        <ul className="space-y-3">
          {resources.slice(0, 5).map((resource, index) => {
            const domain = getDomainById(resource.domain_id);
            return (
              <li key={resource.id}>
                <Link
                  href={`/books/${resource.id}`}
                  className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-[#F8FAFC]"
                >
                  {/* 排名 */}
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold"
                    style={{
                      backgroundColor: index < 3 ? color : "#E2E8F0",
                      color: index < 3 ? "white" : "#64748B",
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* 内容 */}
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 line-clamp-1 text-sm font-medium text-[#10213E] group-hover:text-[#5DB2E2]">
                      {resource.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {resource.author && (
                        <span className="text-xs text-[#64748B]">
                          {resource.author}
                        </span>
                      )}
                      {domain && (
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: domain.color }}
                          title={domain.name}
                        />
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex h-24 items-center justify-center text-sm text-[#64748B]">
          {emptyText}
        </div>
      )}
    </div>
  );
}