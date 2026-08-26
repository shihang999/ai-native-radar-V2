"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Resource } from "@/lib/database.types";
import type { RankingHistoryPeriod } from "@/lib/mock/ranking-history";
import { getDomainById } from "@/lib/constants";

interface RankingCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  resources: Resource[];
  /** 历史期次快照（mock）；传入后右上角显示「历史榜单」入口 */
  history?: RankingHistoryPeriod[];
  emptyText?: string;
}

/** 榜单列表项统一结构（当前/历史共用） */
interface RankingListItem {
  id: string;
  title: string;
  author: string | null;
  domainId: string;
}

/** 特殊期次标识：当前榜单 */
const CURRENT_PERIOD_ID = "__current__";

function toListItem(resource: Resource): RankingListItem {
  return {
    id: resource.id,
    title: resource.title,
    author: resource.author,
    domainId: resource.domain_id,
  };
}

const HistoryIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function RankingCard({
  title,
  icon,
  color,
  resources,
  history,
  emptyText = "暂无数据",
}: RankingCardProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CURRENT_PERIOD_ID);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasHistory = Boolean(history && history.length > 0);

  // 点击卡片外部时关闭历史下拉
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const selectedPeriod =
    selectedPeriodId === CURRENT_PERIOD_ID
      ? null
      : history?.find((p) => p.id === selectedPeriodId) ?? null;

  const items: RankingListItem[] = selectedPeriod
    ? selectedPeriod.items
    : resources.map(toListItem);

  const currentLabel = selectedPeriod ? selectedPeriod.label : "当前";

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      {/* 标题 + 右上角历史榜单入口 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon}
          </div>
          <h3 className="truncate text-base font-semibold text-[#10213E]">{title}</h3>
        </div>

        {hasHistory && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#10213E]"
              title="查看历史榜单"
            >
              <HistoryIcon />
              <span>{currentLabel}</span>
              <ChevronIcon open={menuOpen} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg"
              >
                <PeriodOption
                  label="当前"
                  active={selectedPeriodId === CURRENT_PERIOD_ID}
                  color={color}
                  onClick={() => {
                    setSelectedPeriodId(CURRENT_PERIOD_ID);
                    setMenuOpen(false);
                  }}
                />
                <div className="my-1 border-t border-[#F1F5F9]" />
                {history!.map((period) => (
                  <PeriodOption
                    key={period.id}
                    label={period.label}
                    active={selectedPeriodId === period.id}
                    color={color}
                    onClick={() => {
                      setSelectedPeriodId(period.id);
                      setMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 列表 */}
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item, index) => {
            const domain = getDomainById(item.domainId);
            return (
              <li key={item.id}>
                <Link
                  href={`/books/${item.id}`}
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
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.author && (
                        <span className="text-xs text-[#64748B]">
                          {item.author}
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

function PeriodOption({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-[#F8FAFC]"
      style={active ? { color, fontWeight: 600 } : { color: "#64748B" }}
    >
      <span>{label}</span>
      {active && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
