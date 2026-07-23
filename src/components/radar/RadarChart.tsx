"use client";

import { useState, useRef, useMemo } from "react";
import { DOMAINS, RADAR_CONFIG, type Book } from "@/lib/constants";
import { Ring } from "./Ring";
import { SectorLine } from "./SectorLine";
import { SectorLabel } from "./SectorLabel";
import { RingLabel } from "./RingLabel";
import { Blip } from "./Blip";
import { BookTooltip } from "./BookTooltip";
import { BookDetailModal } from "./BookDetailModal";

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

  // 按领域分组
  books.forEach((book) => {
    const group = domainGroups.get(book.domainId) || [];
    group.push(book);
    domainGroups.set(book.domainId, group);
  });

  // 为每个领域内的书籍编号
  const numbering = new Map<string, number>();
  domainGroups.forEach((groupBooks) => {
    groupBooks.forEach((book, index) => {
      numbering.set(book.id, index + 1);
    });
  });

  return numbering;
}

/**
 * 计算防重叠网格布局
 * 将每个扇区划分为网格，确保点位不重叠
 */
function applyGridLayout(
  books: Book[],
  cx: number,
  cy: number,
  maxRadius: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // 按领域和圈层分组
  const groups = new Map<string, Book[]>();
  books.forEach((book) => {
    const key = `${book.domainId}-${book.ringId}`;
    const group = groups.get(key) || [];
    group.push(book);
    groups.set(key, group);
  });

  // 为每个组应用网格布局
  groups.forEach((groupBooks, key) => {
    const [domainId, ringId] = key.split("-");

    // 计算该组的扇区范围和半径范围
    const domain = books.find((b) => b.domainId === domainId);
    const ring = books.find((b) => b.ringId === ringId);

    if (!domain || !ring) return;

    // 简单网格布局：根据组内书籍数量分配位置
    const count = groupBooks.length;
    const gridSize = Math.ceil(Math.sqrt(count));

    groupBooks.forEach((book, index) => {
      // 使用确定性哈希生成初始位置
      const hash = simpleHash(book.id);
      const offsetX = ((hash % 100) / 100) * 20 - 10;
      const offsetY = ((hash % 100) / 100) * 20 - 10;

      // 保留原有的计算逻辑，只是添加微小的网格偏移
      const basePos = computeBasePosition(book, cx, cy, maxRadius);
      positions.set(book.id, {
        x: basePos.x + offsetX,
        y: basePos.y + offsetY,
      });
    });
  });

  return positions;
}

function computeBasePosition(
  book: Book,
  cx: number,
  cy: number,
  maxRadius: number
): { x: number; y: number } {
  const domain = book.domainId;
  const ring = book.ringId;

  // 这里使用简化版本，实际计算在 Blip 组件中完成
  return { x: cx, y: cy };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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

  // 为每个书籍分配领域内编号
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

  // 追踪鼠标位置（用于 tooltip 定位）
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

  // 计算每个书籍的高亮状态
  const getHighlightState = (
    book: Book,
    hovered: Book | null,
    activeDomainId: string | null
  ): HighlightState => {
    if (!activeDomainId) return "none";
    if (hovered && book.id === hovered.id) return "self";
    return book.domainId === activeDomainId ? "active-domain" : "inactive-domain";
  };

  const activeDomainId = hoveredBook?.domainId ?? hoveredDomainId;
  const hasActiveSector = Boolean(activeDomainId);

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
        {/* 扇面高亮（hover 时启用） */}
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
          const highlightState = getHighlightState(book, hoveredBook, activeDomainId);
          const domainNumber = domainNumbers.get(book.id) || 1;
          const group = groupMeta.get(book.id);
          const groupIndex = group?.index ?? 0;
          const groupCount = group?.count ?? 1;

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
              onHover={setHoveredBook}
              onClick={setSelectedBook}
            />
          );
        })}
      </svg>

      {/* 悬浮卡片 */}
      {hoveredBook && !selectedBook && (
        <BookTooltip
          book={hoveredBook}
          mouseX={mousePosition.x}
          mouseY={mousePosition.y}
        />
      )}

      {/* 详情弹窗 */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </>
  );
}
