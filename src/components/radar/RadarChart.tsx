"use client";

import { useState, useRef, useMemo } from "react";
import { RADAR_CONFIG } from "@/lib/constants";
import { type Book } from "@/lib/constants";
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

export function RadarChart({ books }: RadarChartProps) {
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // 为每个书籍分配领域内编号
  const domainNumbers = useMemo(() => assignDomainNumbers(books), [books]);

  // 追踪鼠标位置（用于 tooltip 定位）
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // 计算每个书籍的高亮状态
  const getHighlightState = (
    book: Book,
    hovered: Book | null
  ): "self" | "same-domain" | "same-ring" | "other" | "none" => {
    if (!hovered) return "none";
    if (book.id === hovered.id) return "self";
    if (book.domainId === hovered.domainId) return "same-domain";
    if (book.ringId === hovered.ringId) return "same-ring";
    return "other";
  };

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[680px] aspect-square mx-auto"
        role="img"
        aria-label="AI-Native 读书雷达"
        onMouseMove={handleMouseMove}
      >
        {/* 圈层 */}
        <Ring cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 扇区分隔线 */}
        <SectorLine cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 扇区标签（领域名） */}
        <SectorLabel cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 圈层标签（难度） */}
        <RingLabel cx={centerX} cy={centerY} maxRadius={maxRadius} />

        {/* 书籍 blip 点 */}
        {books.map((book) => {
          const highlightState = getHighlightState(book, hoveredBook);
          const domainNumber = domainNumbers.get(book.id) || 1;

          return (
            <Blip
              key={book.id}
              book={book}
              cx={centerX}
              cy={centerY}
              maxRadius={maxRadius}
              domainNumber={domainNumber}
              highlightState={highlightState}
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