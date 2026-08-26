"use client";

import Image from "next/image";
import { useState } from "react";
import {
  getBookCoverUrl,
  getGeneratedCoverStyle,
  type BookCoverSize,
} from "@/lib/book-cover";

interface BookCoverProps {
  /** ISBN，用于从 Open Library 获取封面（加载失败时降级为模版封面） */
  isbn?: string | null;
  /** 已有的封面 URL（如数据库中的 cover_image_url），优先级高于 ISBN */
  coverImageUrl?: string | null;
  /** 书名，用于 alt 文案与模版封面标题 */
  title: string;
  /** 作者，用于模版封面副标题 */
  author?: string | null;
  /** 领域 id，用于模版封面主题色 */
  domainId?: string | null;
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
 * 优先级：coverImageUrl（数据库封面）> Open Library 封面（按 ISBN）> 前端模版封面（书名 + 领域色）
 * 无网络封面来源或加载失败时，用 CSS/SVG 确定性渲染模版封面，避免空白占位图。
 */
export function BookCover({
  isbn,
  coverImageUrl,
  title,
  author,
  domainId,
  size = "M",
  className,
  width,
  height,
  priority,
  sizes,
}: BookCoverProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const openLibraryUrl = isbn ? getBookCoverUrl(isbn, size) : null;
  const showTemplate = loadFailed || (!coverImageUrl && !openLibraryUrl);

  if (showTemplate) {
    return (
      <GeneratedCover
        title={title}
        author={author}
        domainId={domainId}
        className={className}
      />
    );
  }

  const src = (coverImageUrl ?? openLibraryUrl)!;
  const fill = width === undefined || height === undefined;

  return (
    <Image
      src={src}
      alt={`${title} 封面`}
      className={className}
      onError={() => setLoadFailed(true)}
      {...(fill
        ? { fill: true, sizes: sizes ?? "(max-width: 768px) 100vw, 33vw" }
        : { width, height })}
      priority={priority}
    />
  );
}

/**
 * 模版封面：按领域色渐变背景 + 书名/作者排版，纯 CSS/SVG 渲染，无网络依赖。
 * 通过 absolute inset-0 填满父容器（与 Image fill 模式一致）。
 * 无封面数据时用书名代替：书名尽量大，从左上角开始填充。
 * 字号使用容器查询单位 cqw，随封面宽度自适应（列表卡 / 详情大图通用）。
 */
function GeneratedCover({
  title,
  author,
  domainId,
  className,
}: {
  title: string;
  author?: string | null;
  domainId?: string | null;
  className?: string;
}) {
  const { background, accent } = getGeneratedCoverStyle({ title, domainId });

  return (
    <div
      className={`absolute inset-0 h-full w-full overflow-hidden ${className ?? ""}`}
      style={{ background, containerType: "inline-size" }}
      role="img"
      aria-label={`${title} 封面`}
    >
      {/* 书名 + 作者：左上角填充，书名尽量大 */}
      <div className="px-[7%] pt-[7%]">
        <p
          className="line-clamp-6 font-bold leading-[1.05] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]"
          style={{ fontSize: "clamp(1.15rem, 13cqw, 2.75rem)" }}
        >
          {title}
        </p>
        {author && (
          <p
            className="mt-[4%] line-clamp-1 font-medium text-white/85"
            style={{ fontSize: "clamp(0.7rem, 4.5cqw, 1rem)" }}
          >
            {author}
          </p>
        )}
      </div>

      {/* 底部主题色装饰条 */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-1.5 w-full"
        style={{ backgroundColor: accent, filter: "brightness(0.7)" }}
      />
    </div>
  );
}
