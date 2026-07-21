"use client";

import { useState, useMemo } from "react";
import {
  type Book,
  getDomainById,
  getRingById,
  RADAR_CONFIG,
} from "@/lib/constants";

interface BlipProps {
  book: Book;
  cx: number;
  cy: number;
  maxRadius: number;
  domainNumber: number;
  highlightState?: "self" | "same-domain" | "same-ring" | "other" | "none";
  onHover?: (book: Book | null) => void;
  onClick?: (book: Book) => void;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
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
): { x: number; y: number } {
  const domain = getDomainById(book.domainId);
  const ring = getRingById(book.ringId);

  if (!domain || !ring) {
    return { x: cx, y: cy };
  }

  const sectorSpan = domain.angleEnd - domain.angleStart;
  const midAngle = domain.angleStart + sectorSpan * 0.5;

  const hash = simpleHash(book.id);
  const angleOffset = ((hash % 100) / 100) * sectorSpan * 0.6 - sectorSpan * 0.3;
  const angle = midAngle + angleOffset;

  const ringSpan = 1 / 3;
  const ringCenter = ring.radiusRatio;
  const radiusOffset = ((hash % 50) / 50) * ringSpan * 0.3 - ringSpan * 0.15;
  const r = maxRadius * (ringCenter + radiusOffset);

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
  highlightState = "none",
  onHover,
  onClick,
}: BlipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { x, y } = useMemo(
    () => computeBlipPosition(book, cx, cy, maxRadius),
    [book, cx, cy, maxRadius]
  );

  const domain = getDomainById(book.domainId);
  const color = domain?.color || "#6B7280";

  const { blipRadius, ringRadius, hoverRadius } = RADAR_CONFIG;

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
    if (highlightState === "same-domain") return 0.6;
    if (highlightState === "same-ring") return 0.4;
    if (highlightState === "other") return 0.2;
    return 1;
  };

  const getScale = () => {
    if (highlightState === "self") return 1.2;
    return 1;
  };

  const opacity = getOpacity();
  const scale = getScale();
  const isHighlighted = highlightState === "self";
  const currentRadius = isHovered ? hoverRadius : blipRadius * scale;

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      {/* 外圆环（行星环效果） - 非悬停状态显示 */}
      {!isHovered && (
        <circle
          cx={x}
          cy={y}
          r={ringRadius * scale}
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
              x={x - hoverRadius}
              y={y - hoverRadius}
              width={hoverRadius * 2}
              height={hoverRadius * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`circle(${hoverRadius}px at ${x} ${y})`}
              style={{
                pointerEvents: "none",
              }}
            />
          ) : (
            <circle
              cx={x}
              cy={y}
              r={hoverRadius}
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
          fontSize={10}
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
          fontSize={20}
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