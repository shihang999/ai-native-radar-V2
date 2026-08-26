"use client";

import type { RadarVersion } from "@/lib/mock/radar-versions";

interface RadarVersionTimelineProps {
  versions: RadarVersion[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

/**
 * 雷达版本时间线（客户端组件）
 * - 竖向时间线，最新在最上方（versions 数组第一个）
 * - 默认仅展示时间线、节点与版本号块，保持简洁
 * - 鼠标悬停版本块时才展开具体日期与版本详情
 * - isCurrent 版本节点主题色实心 +「当前」徽标
 * - selectedId 对应卡片描边高亮
 */
export function RadarVersionTimeline({
  versions,
  selectedId,
  onSelect,
}: RadarVersionTimelineProps) {
  return (
    <div className="w-full">
      <h2 className="mb-4 text-sm font-semibold text-[#10213E]">雷达版本</h2>

      <ol className="relative max-h-[560px] space-y-2 overflow-y-auto pl-6">
        {/* 竖向时间轴基线 */}
        <span
          aria-hidden
          className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E2E8F0]"
        />

        {versions.map((version) => {
          const isSelected = version.id === selectedId;
          return (
            <li key={version.id} className="group relative">
              {/* 时间轴节点 */}
              <span
                aria-hidden
                className={`absolute -left-[22px] top-3 h-3.5 w-3.5 rounded-full border-2 ${
                  version.isCurrent
                    ? "border-[#2563EB] bg-[#2563EB]"
                    : "border-[#94A3B8] bg-white"
                }`}
              />

              <button
                type="button"
                onClick={() => onSelect(version.id)}
                aria-pressed={isSelected}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-[#2563EB] bg-[#EFF6FF]"
                    : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#10213E]">
                    {version.label}
                  </span>
                  {version.isCurrent && (
                    <span className="shrink-0 rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold text-white">
                      当前
                    </span>
                  )}
                </div>

                {/* 悬停展开：日期 + 版本详情 */}
                <div className="grid grid-rows-[0fr] transition-all duration-200 ease-out group-hover:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <div className="pt-1.5 text-[11px] text-[#94A3B8]">
                      {formatDate(version.date)}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#64748B]">
                      {version.summary}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
