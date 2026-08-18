"use client";

import { useEffect, useState } from "react";
import { type Book, getDomainById, getRingById } from "@/lib/constants";

interface BookTooltipProps {
  book: Book;
  /** 基准点的屏幕/页面坐标（clientX / clientY），可以是鼠标位置或 SVG 点位映射后的坐标 */
  mouseX: number;
  mouseY: number;
  /** 是否来自系统自动 Spotlight（true 时附加一个轻微 "自动播放中" 视觉标识） */
  autoSpotlight?: boolean;
  /** 自动 Spotlight 进入 exit 阶段时为 true，触发淡出动画 */
  leaving?: boolean;
}

/** Popup 淡入/淡出 + 上浮动画时长（ms，处于 200~400ms 区间） */
const TOOLTIP_TRANSITION_MS = 300;

/**
 * 雷达点位 Tooltip 组件
 *  - 自动 spotlight 与用户 hover 完全复用同一个组件
 *  - 挂载后淡入 + 上浮出现；leaving 时淡出（自动 Spotlight exit 阶段）
 *  - 根据基准点自动判断 Tooltip 显示方向，避免超出视口边界
 */
export function BookTooltip({ book, mouseX, mouseY, autoSpotlight = false, leaving = false }: BookTooltipProps) {
  const [entered, setEntered] = useState(false);

  // 挂载后下一帧再置为可见，触发 CSS transition 淡入/上浮
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  const shown = entered && !leaving;
  const domain = getDomainById(book.domainId);
  const ring = getRingById(book.ringId);

  const offsetX = 16;
  const offsetY = 16;
  const tooltipWidth = 280;
  const estimatedHeight = 210;

  let left = mouseX + offsetX;
  let top = mouseY + offsetY;

  const pad = 16;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  const rightOverflow = left + tooltipWidth + pad - vw;
  if (rightOverflow > 0) {
    // 翻转到左侧：基准点左边再往左偏移 tooltip 宽度
    left = mouseX - tooltipWidth - offsetX;
  }
  const leftOverflow = pad - left;
  if (leftOverflow > 0) {
    left = pad;
  }

  const bottomOverflow = top + estimatedHeight + pad - vh;
  if (bottomOverflow > 0) {
    // 翻转到上方：基准点上方
    top = mouseY - estimatedHeight - offsetY;
  }
  const topOverflow = pad - top;
  if (topOverflow > 0) {
    top = pad;
  }

  const truncatedReason =
    book.reason.length > 50 ? book.reason.substring(0, 50) + "..." : book.reason;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(10px)",
        transition: `opacity ${TOOLTIP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${TOOLTIP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        // 自动 Spotlight 时略延迟，等封面出现后再淡入 Popup；淡出不延迟
        transitionDelay: autoSpotlight && !leaving ? "120ms" : "0ms",
      }}
    >
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#10213E]">
            {book.title}
          </h4>
          {autoSpotlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-medium text-[#2563EB]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563EB]" />
              自动发现
            </span>
          )}
        </div>

        <p className="mb-3 text-xs text-[#64748B]">{book.author}</p>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {domain && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F6] px-2 py-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: domain.color }}
              />
              <span className="text-[#10213E]">{domain.name}</span>
            </span>
          )}
          {ring && (
            <span className="rounded-full bg-[#F5F5F6] px-2 py-1 text-[#10213E]">
              {ring.name}
            </span>
          )}
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-[#64748B]">推荐指数</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${
                  i < book.rating
                    ? "fill-[#F59E0B] text-[#F59E0B]"
                    : "text-[#E2E8F0]"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>

        {book.reason && (
          <div className="border-t border-[#E2E8F0] pt-3">
            <p className="text-xs leading-relaxed text-[#64748B]">
              {truncatedReason}
            </p>
          </div>
        )}

        <p className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          {autoSpotlight ? "移动鼠标即可手动探索更多" : "点击查看详情"}
        </p>
      </div>
    </div>
  );
}
