import { type Book, getDomainById, getRingById } from "@/lib/constants";

interface BookTooltipProps {
  book: Book;
  mouseX: number;
  mouseY: number;
}

/**
 * 雷达点位 Tooltip 组件
 * 遵循 MVP 0.3.0 设计规范：白色背景、投影、推荐理由摘要
 */
export function BookTooltip({ book, mouseX, mouseY }: BookTooltipProps) {
  const domain = getDomainById(book.domainId);
  const ring = getRingById(book.ringId);

  // 计算 tooltip 位置，避免超出视口
  const offsetX = 16;
  const offsetY = 16;
  const tooltipWidth = 280;

  let left = mouseX + offsetX;
  let top = mouseY + offsetY;

  // 如果右侧空间不足，显示在左侧
  if (left + tooltipWidth > window.innerWidth - 16) {
    left = mouseX - tooltipWidth - offsetX;
  }

  // 如果底部空间不足，显示在上方
  if (top + 200 > window.innerHeight - 16) {
    top = mouseY - 200 - offsetY;
  }

  // 截断推荐理由至 50 字
  const truncatedReason =
    book.reason.length > 50 ? book.reason.substring(0, 50) + "..." : book.reason;

  return (
    <div
      className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
      }}
    >
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-lg">
        {/* 书名 */}
        <h4 className="mb-1 text-sm font-semibold text-[#10213E]">
          {book.title}
        </h4>

        {/* 作者 */}
        <p className="mb-3 text-xs text-[#64748B]">{book.author}</p>

        {/* 元信息标签 */}
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

        {/* 推荐指数 */}
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

        {/* 推荐理由摘要 */}
        {book.reason && (
          <div className="border-t border-[#E2E8F0] pt-3">
            <p className="text-xs leading-relaxed text-[#64748B]">
              {truncatedReason}
            </p>
          </div>
        )}

        {/* 点击提示 */}
        <p className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          点击查看详情
        </p>
      </div>
    </div>
  );
}