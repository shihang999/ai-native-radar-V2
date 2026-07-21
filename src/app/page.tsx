"use client";

import { useEffect, useState } from "react";
import { RadarChart } from "@/components/radar/RadarChart";
import { RINGS } from "@/lib/constants";
import { getResources } from "@/lib/api/resources";
import type { Resource } from "@/lib/database.types";
import type { Book } from "@/lib/constants";

/**
 * 将 Resource 转换为 Book 类型
 */
function convertResourceToBook(resource: Resource): Book {
  return {
    id: resource.id,
    title: resource.title,
    author: resource.author || "未知作者",
    domainId: resource.domain_id,
    ringId: resource.ring_id,
    rating: (resource.rating || 3) as 1 | 2 | 3 | 4 | 5,
    reason: resource.reason,
  };
}

/**
 * 首页（雷达主页）
 * 遵循 MVP 0.3.0 计划：简洁、聚焦雷达主视觉
 */
export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const resources = await getResources();
        const convertedBooks = resources.map(convertResourceToBook);
        setBooks(convertedBooks);
      } catch (error) {
        console.error("获取书籍数据失败:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#5DB2E2] border-r-transparent" />
          <p className="text-sm text-[#64748B]">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero 区域 */}
      <section className="mb-8 max-w-[760px]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#5DB2E2]">
          AI 学习认知地图
        </p>
        <h1 className="mb-5 text-4xl font-bold text-[#10213E]">
          AI-Native 读书雷达
        </h1>
        <p className="max-w-[680px] text-base leading-7 text-[#64748B]">
          这不是普通书单，而是一张 AI 学习认知地图。它把代表性书籍放入知识领域和学习阶段中，帮助你先建立结构，再决定从哪里开始读、下一步补什么。
        </p>
      </section>

      {/* 雷达主视觉区 - 占据整行，尽可能大 */}
      <section className="mb-8">
        <RadarChart books={books} />
      </section>

      {/* 信息栏 - 移到下方 */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 如何读这张雷达 */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-[#10213E]">
            如何读这张雷达
          </h2>
          <dl className="grid gap-2 text-xs leading-6">
            <div className="border-l-2 border-[#5DB2E2] pl-3">
              <dt className="font-semibold text-[#10213E]">颜色 = 知识领域</dt>
              <dd className="text-[#64748B]">不同颜色代表 AI 学习中的不同认知方向。</dd>
            </div>
            <div className="border-l-2 border-[#5DB2E2] pl-3">
              <dt className="font-semibold text-[#10213E]">圈层 = 学习阶段</dt>
              <dd className="text-[#64748B]">越靠近中心越适合作为起点，越靠外越偏进阶。</dd>
            </div>
            <div className="border-l-2 border-[#5DB2E2] pl-3">
              <dt className="font-semibold text-[#10213E]">点 = 代表性书籍</dt>
              <dd className="text-[#64748B]">每个点是一本文本样例，位置表达它的领域和阶段。</dd>
            </div>
            <div className="border-l-2 border-[#5DB2E2] pl-3">
              <dt className="font-semibold text-[#10213E]">透明度 = 推荐强度</dt>
              <dd className="text-[#64748B]">透明度越高，表示当前样例中的推荐强度越高。</dd>
            </div>
          </dl>
        </div>

        {/* 学习阶段 */}
        <div className="md:col-span-1">
          <h2 className="mb-4 text-base font-semibold text-[#10213E]">
            学习阶段
          </h2>
          <div className="grid gap-2">
            {RINGS.map((ring) => (
              <div key={ring.id} className="flex items-start gap-2 text-xs">
                <span className="mt-2 h-px w-6 shrink-0 bg-[#E2E8F0]" />
                <div>
                  <p className="font-semibold text-[#10213E]">{ring.name}</p>
                  <p className="leading-5 text-[#64748B]">{ring.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}