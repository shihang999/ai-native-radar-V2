"use client";

import { useMemo, useState } from "react";
import type { Book } from "@/lib/constants";
import { RADAR_VERSIONS } from "@/lib/mock/radar-versions";
import { RadarChart } from "./RadarChart";
import { RadarVersionTimeline } from "./RadarVersionTimeline";

interface RadarWithTimelineProps {
  books: Book[];
}

/**
 * 雷达 + 版本时间线联动容器（客户端组件）
 * - 内部维护当前所选版本
 * - 把所选版本的 addedBookIds 作为 highlightBookIds 下传给 RadarChart
 * - 返回两个栅格子项（Fragment）：雷达（居中列）+ 时间线（右列），
 *   由 page.tsx 的三列栅格 [240px_1fr_240px] 承载，使雷达整体居中、时间线在右。
 */
export function RadarWithTimeline({ books }: RadarWithTimelineProps) {
  const initialId = useMemo(
    () => RADAR_VERSIONS.find((v) => v.isCurrent)?.id ?? RADAR_VERSIONS[0]?.id ?? "",
    [],
  );
  const [selectedId, setSelectedId] = useState(initialId);

  const highlightBookIds = useMemo(
    () => RADAR_VERSIONS.find((v) => v.id === selectedId)?.addedBookIds ?? [],
    [selectedId],
  );

  return (
    <>
      <div className="order-1 mx-auto w-full max-w-[680px] xl:order-2">
        <RadarChart books={books} highlightBookIds={highlightBookIds} />
      </div>
      <aside className="order-3 xl:mt-[66px]">
        <RadarVersionTimeline
          versions={RADAR_VERSIONS}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>
    </>
  );
}
