"use client";

import { useState, useMemo } from "react";
import {
  type Book,
  getDomainById,
  RINGS,
  RADAR_CONFIG,
} from "@/lib/constants";

interface BlipProps {
  book: Book;
  cx: number;
  cy: number;
  maxRadius: number;
  domainNumber: number;
  groupIndex: number;
  groupCount: number;
  highlightState?:
    | "self"
    | "same-domain"
    | "same-ring"
    | "other"
    | "none"
    | "active-domain"
    | "inactive-domain";
  onHover?: (book: Book | null) => void;
  onClick?: (book: Book) => void;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRatingBaseRadius(rating: Book["rating"]): number {
  const mapping: Record<Book["rating"], number> = {
    1: 6,
    2: 7,
    3: 9,
    4: 11,
    5: 13,
  };
  return mapping[rating];
}

/**
 * 基于书籍的 domainId 和 ringId，使用确定性伪随机
 * 计算 blip 在雷达图上的极坐标位置
 */
function computeBlipPosition(
  book: Book,
  cx: number,
  cy: number,
  maxRadius: number,
  groupIndex: number,
  groupCount: number,
  paddingPx: number,
): { x: number; y: number } {
  const domain = getDomainById(book.domainId);
  const ringIndex = RINGS.findIndex((r) => r.id === book.ringId);

  if (!domain || ringIndex === -1) {
    return { x: cx, y: cy };
  }

  const hash = simpleHash(book.id);
  const hash01 = (hash % 10_000) / 10_000;

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
  const angle = clamp(
    baseAngle + angleJitter,
    domain.angleStart + anglePadding,
    domain.angleEnd - anglePadding,
  );

  const outerRatio = RINGS[ringIndex].radiusRatio;
  const innerRatio = ringIndex === 0 ? 0 : RINGS[ringIndex - 1].radiusRatio;
  const paddingRatio = paddingPx / maxRadius;

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
  const ratio = clamp(baseRatio + ratioJitter, minRatio, maxRatio);

  const r = maxRadius * ratio;

  const rad = degToRad(angle);
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  return { x, y };
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

/**
 * 雷达点位组件
 * 实现 MVP 0.4.0 设计规范：
 * - 大点位（16px）+ 外圆环（24px）
 * - 领域内数字ID显示
 * - 悬停缩略图效果（48px）
 * - 分层高亮效果
 */
export function Blip({
  book,
  cx,
  cy,
  maxRadius,
  domainNumber,
  groupIndex,
  groupCount,
  highlightState = "none",
  onHover,
  onClick,
}: BlipProps) {
  const [isHovered, setIsHovered] = useState(false);

  const baseRadius = getRatingBaseRadius(book.rating);
  const baseRingRadius = baseRadius + 5;
  const hoverRadiusCap = Math.min(32, Math.max(RADAR_CONFIG.hoverRadius, baseRadius + 14));
  const paddingPx = baseRingRadius + 2;

  const { x, y } = useMemo(
    () => computeBlipPosition(book, cx, cy, maxRadius, groupIndex, groupCount, paddingPx),
    [book, cx, cy, maxRadius, groupIndex, groupCount, paddingPx]
  );

  const domain = getDomainById(book.domainId);
  const color = domain?.color || "#6B7280";

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(book);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  const handleClick = () => {
    onClick?.(book);
  };

  const getOpacity = () => {
    if (highlightState === "none") return 1;
    if (highlightState === "self") return 1;
    if (highlightState === "active-domain") return 1;
    if (highlightState === "inactive-domain") return 0.12;
    if (highlightState === "same-domain") return 0.6;
    if (highlightState === "same-ring") return 0.4;
    if (highlightState === "other") return 0.2;
    return 1;
  };

  const getScale = () => {
    if (highlightState === "self") return 1.15;
    return 1;
  };

  const opacity = getOpacity();
  const scale = getScale();
  const isHighlighted = highlightState === "self";
  const currentRadius = isHovered ? hoverRadiusCap : baseRadius * scale;
  const currentRingRadius = baseRingRadius * scale;
  const numberFontSize = Math.min(14, Math.max(10, Math.round(baseRadius + 1)));

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      {/* 外圆环（行星环效果） - 非悬停状态显示 */}
      {!isHovered && (
        <circle
          cx={x}
          cy={y}
          r={currentRingRadius}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.3}
          style={{
            transition: "r 0.3s ease, opacity 0.3s ease",
          }}
        />
      )}

      {/* 主圆点 - 悬停时放大为缩略图容器 */}
      <circle
        cx={x}
        cy={y}
        r={currentRadius}
        fill={isHovered && book.coverImageUrl ? "transparent" : color}
        stroke={isHighlighted ? "#FFFFFF" : isHovered ? "#FFFFFF" : "none"}
        strokeWidth={isHighlighted ? 2.5 : 2}
        style={{
          cursor: "pointer",
          transition: "r 0.3s ease, stroke 0.3s ease, fill 0.3s ease",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* 悬停时显示封面图或领域色背景 */}
      {isHovered && (
        <>
          {book.coverImageUrl ? (
            <image
              href={book.coverImageUrl}
              x={x - hoverRadiusCap}
              y={y - hoverRadiusCap}
              width={hoverRadiusCap * 2}
              height={hoverRadiusCap * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`circle(${hoverRadiusCap}px at ${x} ${y})`}
              style={{
                pointerEvents: "none",
              }}
            />
          ) : (
            <circle
              cx={x}
              cy={y}
              r={hoverRadiusCap}
              fill={color}
              opacity={0.8}
              style={{
                pointerEvents: "none",
              }}
            />
          )}
        </>
      )}

      {/* 数字ID - 非悬停状态显示 */}
      {!isHovered && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={numberFontSize}
          fill="#FFFFFF"
          fontWeight="600"
          style={{
            pointerEvents: "none",
            transition: "opacity 0.3s ease",
          }}
        >
          {domainNumber}
        </text>
      )}

      {/* 悬停时显示大数字（无封面图时） */}
      {isHovered && !book.coverImageUrl && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
          fill="#FFFFFF"
          fontWeight="600"
          style={{
            pointerEvents: "none",
          }}
        >
          {domainNumber}
        </text>
      )}
    </g>
  );
}
