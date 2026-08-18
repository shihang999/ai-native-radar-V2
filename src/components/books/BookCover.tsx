"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BOOK_PLACEHOLDER_SRC,
  getBookCoverUrl,
  type BookCoverSize,
} from "@/lib/book-cover";

interface BookCoverProps {
  /** ISBN，用于从 Open Library 获取封面（加载失败时降级为 placeholder） */
  isbn?: string | null;
  /** 已有的封面 URL（如数据库中的 cover_image_url），优先级高于 ISBN */
  coverImageUrl?: string | null;
  /** 书名，用于 alt 文案 */
  title: string;
  /** Open Library 封面尺寸，默认 M */
  size?: BookCoverSize;
  className?: string;
  /** 不传 width/height 时使用 fill 模式，要求父容器有明确尺寸 */
  width?: number;
  height?: number;
  /** 是否优先加载（首屏封面使用） */
  priority?: boolean;
  sizes?: string;
}

/**
 * 书籍封面组件
 * 优先级：coverImageUrl（数据库封面）> Open Library 封面（按 ISBN）> 本地 placeholder
 */
export function BookCover({
  isbn,
  coverImageUrl,
  title,
  size = "M",
  className,
  width,
  height,
  priority,
  sizes,
}: BookCoverProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const openLibraryUrl = isbn ? getBookCoverUrl(isbn, size) : null;
  const showPlaceholder = loadFailed || (!coverImageUrl && !openLibraryUrl);
  const src = showPlaceholder
    ? BOOK_PLACEHOLDER_SRC
    : (coverImageUrl ?? openLibraryUrl)!;

  const fill = width === undefined || height === undefined;

  return (
    <Image
      src={src}
      alt={`${title} 封面`}
      className={className}
      onError={() => {
        // placeholder 是本地静态资源，不会进入失败循环
        if (!showPlaceholder) {
          setLoadFailed(true);
        }
      }}
      {...(fill
        ? { fill: true, sizes: sizes ?? "(max-width: 768px) 100vw, 33vw" }
        : { width, height })}
      priority={priority}
      unoptimized={showPlaceholder}
    />
  );
}
