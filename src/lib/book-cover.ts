/**
 * 书籍封面工具：基于 Open Library Covers API 根据 ISBN 生成封面 URL
 * API 文档：https://openlibrary.org/dev/docs/api/covers
 */

/** Open Library 封面尺寸：S(small) / M(medium) / L(large) */
export type BookCoverSize = "S" | "M" | "L";

/** 本地封面占位图（无 ISBN 或封面加载失败时使用） */
export const BOOK_PLACEHOLDER_SRC = "/images/book-placeholder.png";

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
