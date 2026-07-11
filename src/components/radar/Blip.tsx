import {
  type Book,
  getDomainById,
  getRingById,
  RATING_OPACITY,
  RADAR_CONFIG,
} from "@/lib/constants";

interface BlipProps {
  book: Book;
  cx: number;
  cy: number;
  maxRadius: number;
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
): { x: number; y: number; color: string; opacity: number } {
  const domain = getDomainById(book.domainId);
  const ring = getRingById(book.ringId);

  if (!domain || !ring) {
    return { x: cx, y: cy, color: "#6B7280", opacity: 0.5 };
  }

  const sectorSpan = domain.angleEnd - domain.angleStart;
  const midAngle = domain.angleStart + sectorSpan * 0.5;

  // 使用 book.id 的哈希做确定性偏移，避免所有 blip 堆在扇区中线
  const hash = simpleHash(book.id);
  const angleOffset = ((hash % 100) / 100) * sectorSpan * 0.6 - sectorSpan * 0.3;
  const angle = midAngle + angleOffset;

  // 圈层半径：在 ring.radiusRatio 附近偏移
  const ringSpan = 1 / 3; // 3 等分
  const ringCenter = ring.radiusRatio;
  const radiusOffset = ((hash % 50) / 50) * ringSpan * 0.3 - ringSpan * 0.15;
  const r = maxRadius * (ringCenter + radiusOffset);

  const rad = degToRad(angle);
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  return {
    x,
    y,
    color: domain.color,
    opacity: RATING_OPACITY[book.rating] ?? 0.5,
  };
}

/** 简单字符串哈希，用于确定性偏移 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function Blip({ book, cx, cy, maxRadius }: BlipProps) {
  const { x, y, color, opacity } = computeBlipPosition(book, cx, cy, maxRadius);
  const r = RADAR_CONFIG.blipRadius;

  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={color}
      opacity={opacity}
    >
      <title>{`${book.title} - ${book.author} (${book.rating}星)`}</title>
    </circle>
  );
}
