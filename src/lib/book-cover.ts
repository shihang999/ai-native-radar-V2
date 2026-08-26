/**
 * 书籍封面工具：基于 Open Library Covers API 根据 ISBN 生成封面 URL
 * API 文档：https://openlibrary.org/dev/docs/api/covers
 */

import { getDomainById } from "@/lib/constants";

/** Open Library 封面尺寸：S(small) / M(medium) / L(large) */
export type BookCoverSize = "S" | "M" | "L";

/**
 * 清理 ISBN：trim + 去除连字符和空格
 * 例如 "978-0-14-032872-1" → "9780140328721"
 */
export function cleanIsbn(isbn: string): string {
  return isbn.trim().replace(/[-\s]/g, "");
}

/**
 * 根据 ISBN 生成 Open Library 封面 URL
 * - default=false：无封面时返回错误响应（由前端 onError 降级为 placeholder）
 * - ISBN 清理后为空时返回 null，不请求 API
 */
export function getBookCoverUrl(isbn: string, size: BookCoverSize = "M"): string | null {
  const cleanedIsbn = cleanIsbn(isbn);
  if (!cleanedIsbn) {
    return null;
  }
  return `https://covers.openlibrary.org/b/isbn/${cleanedIsbn}-${size}.jpg?default=false`;
}

/** 确定性字符串 hash（用于按书名稳定挑选渐变角度/装饰，保证 SSR/CSR 一致） */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/** 生成封面模版的视觉参数 */
export interface GeneratedCoverStyle {
  /** 背景渐变（CSS linear-gradient） */
  background: string;
  /** 主题色（领域色，用于装饰条/文字点缀） */
  accent: string;
}

/** 十六进制颜色按比例向白/黑混合，得到同色系的浅色/深色，形成渐变 */
function shiftColor(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel: number) => {
    const target = amount >= 0 ? 255 : 0;
    const ratio = Math.abs(amount);
    const value = Math.round(channel + (target - channel) * ratio);
    return Math.min(255, Math.max(0, value));
  };
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/**
 * 根据书名与领域生成确定性的封面模版样式。
 * - 领域色作为主题色，缺省用品牌蓝 #5DB2E2
 * - 按书名 hash 决定渐变角度，保证同一本书样式稳定
 */
export function getGeneratedCoverStyle(params: {
  title: string;
  domainId?: string | null;
}): GeneratedCoverStyle {
  const { title, domainId } = params;
  const accent = (domainId ? getDomainById(domainId)?.color : undefined) ?? "#5DB2E2";
  const hash = simpleHash(title || "");
  const angle = 120 + (hash % 6) * 20; // 120~220 度之间取几个稳定角度
  const light = shiftColor(accent, 0.28);
  const dark = shiftColor(accent, -0.32);
  return {
    accent,
    background: `linear-gradient(${angle}deg, ${light} 0%, ${accent} 52%, ${dark} 100%)`,
  };
}
