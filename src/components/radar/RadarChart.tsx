"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { DOMAINS, RADAR_CONFIG, type Book } from "@/lib/constants";
import { Ring } from "./Ring";
import { SectorLine } from "./SectorLine";
import { SectorLabel } from "./SectorLabel";
import { RingLabel } from "./RingLabel";
import { Blip } from "./Blip";
import { BookTooltip } from "./BookTooltip";
import { BookDetailModal } from "./BookDetailModal";
import { useAutoSpotlight } from "./useAutoSpotlight";

const { size, centerX, centerY, maxRadius } = RADAR_CONFIG;

interface RadarChartProps {
  books: Book[];
}

type HighlightState =
  | "self"
  | "same-domain"
  | "same-ring"
  | "other"
  | "none"
  | "active-domain"
  | "inactive-domain";

/**
 * 为每个领域内的书籍分配编号
 * 返回 Map<bookId, domainNumber>
 */
function assignDomainNumbers(books: Book[]): Map<string, number> {
  const domainGroups = new Map<string, Book[]>();

  books.forEach((book) => {
    const group = domainGroups.get(book.domainId) || [];
    group.push(book);
    domainGroups.set(book.domainId, group);
  });

  const numbering = new Map<string, number>();
  domainGroups.forEach((groupBooks) => {
    groupBooks.forEach((book, index) => {
      numbering.set(book.id, index + 1);
    });
  });

  return numbering;
}

function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

function isAngleInSector(angle: number, start: number, end: number): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = normalizeAngle(end);
  if (s <= e) return a >= s && a < e;
  return a >= s || a < e;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function buildSectorPath(cx: number, cy: number, radius: number, angleStart: number, angleEnd: number): string {
  const start = polarToCartesian(cx, cy, radius, angleStart);
  const end = polarToCartesian(cx, cy, radius, angleEnd);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

/** 与 Blip 内部保持完全相同的点位计算逻辑（保证 useAutoSpotlight 距离过滤一致） */
function computeBookBlipPosition(
  book: Book,
  cx: number,
  cy: number,
  maxR: number,
  groupIndex: number,
  groupCount: number,
): { x: number; y: number } {
  const baseRadius: Record<Book["rating"], number> = { 1: 6, 2: 7, 3: 9, 4: 11, 5: 13 };
  const rating = book.rating;
  const paddingPx = (baseRadius[rating] + 5) + 2;

  const domain = DOMAINS.find((d) => d.id === book.domainId);
  const rings = [
    { id: "beginner", radiusRatio: 0.33 },
    { id: "intermediate", radiusRatio: 0.63 },
    { id: "advanced", radiusRatio: 0.91 },
  ];
  const ringIndex = rings.findIndex((r) => r.id === book.ringId);
  if (!domain || ringIndex === -1) return { x: cx, y: cy };

  let hash = 0;
  for (let i = 0; i < book.id.length; i += 1) {
    const ch = book.id.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  const hashAbs = Math.abs(hash);
  const hash01 = (hashAbs % 10_000) / 10_000;

  const sectorSpan = domain.angleEnd - domain.angleStart;
  const anglePadding = sectorSpan * 0.12;
  const usableSectorSpan = Math.max(1, sectorSpan - anglePadding * 2);
  const count = Math.max(1, groupCount);
  const rows = Math.ceil(Math.sqrt(count));
  const cols = Math.ceil(count / rows);
  const col = groupIndex % cols;
  const row = Math.floor(groupIndex / cols);

  const baseAngle = (() => {
    if (count === 1) return domain.angleStart + sectorSpan * 0.5;
    if (cols === 1) return domain.angleStart + sectorSpan * 0.5;
    const step = usableSectorSpan / (cols - 1);
    return domain.angleStart + anglePadding + step * col;
  })();
  const angleJitterSpan = cols > 1 ? usableSectorSpan / (cols - 1) : usableSectorSpan;
  const angleJitter = (hash01 - 0.5) * angleJitterSpan * 0.18;
  const clampFn = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const angle = clampFn(baseAngle + angleJitter, domain.angleStart + anglePadding, domain.angleEnd - anglePadding);

  const outerRatio = rings[ringIndex].radiusRatio;
  const innerRatio = ringIndex === 0 ? 0 : rings[ringIndex - 1].radiusRatio;
  const paddingRatio = paddingPx / maxR;
  const minRatio = innerRatio + paddingRatio;
  const maxRatio = outerRatio - paddingRatio;
  const usableBand = Math.max(0.001, maxRatio - minRatio);
  const baseRatio = (() => {
    if (rows === 1) return minRatio + usableBand * 0.5;
    const step = usableBand / (rows - 1);
    return minRatio + step * row;
  })();
  const ratioJitterSpan = rows > 1 ? usableBand / (rows - 1) : usableBand;
  const ratioJitter = (hash01 - 0.5) * ratioJitterSpan * 0.22;
  const ratio = clampFn(baseRatio + ratioJitter, minRatio, maxRatio);
  const r = maxR * ratio;

  const rad = degToRad(angle);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function RadarChart({ books }: RadarChartProps) {
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredDomainId, setHoveredDomainId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const displayBooks = useMemo(() => {
    const byDomain = new Map<string, Book[]>();
    books.forEach((book) => {
      const group = byDomain.get(book.domainId) || [];
      group.push(book);
      byDomain.set(book.domainId, group);
    });

    return DOMAINS.flatMap((domain) => {
      const group = byDomain.get(domain.id) || [];
      const sorted = [...group].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
      return sorted.slice(0, 20);
    });
  }, [books]);

  const domainNumbers = useMemo(() => assignDomainNumbers(displayBooks), [displayBooks]);

  const groupMeta = useMemo(() => {
    const groups = new Map<string, Book[]>();
    displayBooks.forEach((book) => {
      const key = `${book.domainId}:${book.ringId}`;
      const group = groups.get(key) || [];
      group.push(book);
      groups.set(key, group);
    });

    const meta = new Map<string, { index: number; count: number }>();
    groups.forEach((groupBooks) => {
      const sorted = [...groupBooks].sort((a, b) => a.id.localeCompare(b.id));
      sorted.forEach((book, index) => {
        meta.set(book.id, { index, count: sorted.length });
      });
    });
    return meta;
  }, [displayBooks]);

  // 计算每本书的点位坐标（和 Blip 内部逻辑同构，供 Auto Spotlight 距离过滤使用）
  const bookPositionMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    displayBooks.forEach((book) => {
      const g = groupMeta.get(book.id);
      const pos = computeBookBlipPosition(
        book,
        centerX,
        centerY,
        maxRadius,
        g?.index ?? 0,
        g?.count ?? 1,
      );
      m.set(book.id, pos);
    });
    return m;
  }, [displayBooks, groupMeta]);

  const getBookPosition = useCallback(
    (book: Book) => bookPositionMap.get(book.id),
    [bookPositionMap],
  );

  // Auto Spotlight（系统自动随机聚焦）
  const {
    autoSpotlightBook,
    isSpotlightActive,
    setExternalHoveredBook,
  } = useAutoSpotlight(displayBooks, {
    getBookPosition,
    disabled: !!selectedBook,
  });

  // 展示优先级：hoveredBook（用户悬停） > autoSpotlightBook（系统自动）
  const effectiveShownBook = hoveredBook ?? autoSpotlightBook;
  const shownIsAuto = !hoveredBook && !!autoSpotlightBook;

  // 鼠标进入任何书：暂停 autoSpotlight
  useEffect(() => {
    setExternalHoveredBook(hoveredBook);
  }, [hoveredBook, setExternalHoveredBook]);

  // 追踪鼠标位置（用于真实 hover 时 tooltip 定位）
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });

    const svg = svgRef.current;
    if (!svg) {
      setHoveredDomainId(null);
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setHoveredDomainId(null);
      return;
    }

    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      setHoveredDomainId(null);
      setHoveredBook(null);
      return;
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const domain = DOMAINS.find((d) => isAngleInSector(angle, d.angleStart, d.angleEnd));
    setHoveredDomainId(domain ? domain.id : null);
  };

  const getHighlightState = (
    book: Book,
    hovered: Book | null,
    activeDomainId: string | null,
  ): HighlightState => {
    if (!activeDomainId) return "none";
    if (hovered && book.id === hovered.id) return "self";
    return book.domainId === activeDomainId ? "active-domain" : "inactive-domain";
  };

  const activeDomainId = hoveredBook?.domainId ?? autoSpotlightBook?.domainId ?? hoveredDomainId;
  const hasActiveSector = Boolean(activeDomainId);

  // 计算 Tooltip 基准点：
  //  - 用户真实 hover：用鼠标 client 坐标（原有行为）
  //  - 系统自动 Spotlight：把 SVG 内部点位 (x,y) 映射为 client 坐标
  const tooltipAnchor = useMemo<{ x: number; y: number } | null>(() => {
    if (!effectiveShownBook) return null;
    if (!shownIsAuto) {
      return { x: mousePosition.x, y: mousePosition.y };
    }
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const internalPos = bookPositionMap.get(effectiveShownBook.id);
    if (!internalPos) return null;
    const scaleX = rect.width / size;
    const scaleY = rect.height / size;
    return {
      x: rect.left + internalPos.x * scaleX,
      y: rect.top + internalPos.y * scaleY,
    };
  }, [effectiveShownBook, shownIsAuto, mousePosition.x, mousePosition.y, bookPositionMap]);

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto w-full max-w-none aspect-square"
        role="img"
        aria-label="AI-Native 读书雷达"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredDomainId(null);
          setHoveredBook(null);
        }}
      >
        {/* 扇面高亮（hover 或 自动spotlight 时启用） */}
        {hasActiveSector && (
          <g style={{ pointerEvents: "none" }}>
            {DOMAINS.map((domain) => {
              const isActive = domain.id === activeDomainId;
              const fill = isActive ? "rgba(15,23,42,0.06)" : "rgba(15,23,42,0.02)";
              const epsilon = 0.2;
              const path = buildSectorPath(
                centerX,
                centerY,
                maxRadius,
                domain.angleStart - epsilon,
                domain.angleEnd + epsilon,
              );
              return <path key={domain.id} d={path} fill={fill} />;
            })}
          </g>
        )}

        {/* 圈层 */}
        <Ring cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 扇区分隔线 */}
        <SectorLine cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 扇区标签（领域名） */}
        <SectorLabel cx={centerX} cy={centerY} maxRadius={maxRadius} activeDomainId={activeDomainId} />

        {/* 圈层标签（难度） */}
        <RingLabel cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 书籍 blip 点 */}
        {displayBooks.map((book) => {
          const highlightState = getHighlightState(book, effectiveShownBook, activeDomainId);
          const domainNumber = domainNumbers.get(book.id) || 1;
          const group = groupMeta.get(book.id);
          const groupIndex = group?.index ?? 0;
          const groupCount = group?.count ?? 1;
          const isSelf = effectiveShownBook?.id === book.id;
          const isAuto = shownIsAuto && isSelf;

          return (
            <Blip
              key={book.id}
              book={book}
              cx={centerX}
              cy={centerY}
              maxRadius={maxRadius}
              domainNumber={domainNumber}
              highlightState={highlightState}
              groupIndex={groupIndex}
              groupCount={groupCount}
              isAutoSpotlight={isAuto}
              isActive={isSelf}
              onHover={setHoveredBook}
              onClick={setSelectedBook}
            />
          );
        })}
      </svg>

      {/* 悬浮卡片：自动 spotlight 和 真实 hover 共用同一个组件 */}
      {effectiveShownBook && !selectedBook && tooltipAnchor && (
        <BookTooltip
          key={`tooltip-${effectiveShownBook.id}-${shownIsAuto ? "auto" : "hover"}`}
          book={effectiveShownBook}
          mouseX={tooltipAnchor.x}
          mouseY={tooltipAnchor.y}
          autoSpotlight={shownIsAuto}
        />
      )}

      {/* 详情弹窗 */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}

      {/* 自动播放状态提示（仅在系统自动 spotlight 播放中、且无用户 hover 时显示） */}
      {isSpotlightActive && !hoveredBook && !selectedBook && autoSpotlightBook && (
        <div className="pointer-events-none mx-auto mt-4 flex w-full max-w-[720px] items-center justify-center gap-2 text-[11px] text-[#64748B]">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563EB]" />
          正在为你随机发现好书 · 移动鼠标即可手动探索
        </div>
      )}
    </>
  );
}
