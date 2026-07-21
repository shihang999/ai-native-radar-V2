"use client";

import { useEffect, useState } from "react";
import { submitRating, getResourceStats, hasUserRated } from "@/lib/api/resources";
import { getSessionId } from "@/lib/session";

interface RatingSectionProps {
  resourceId: string;
}

export function RatingSection({ resourceId }: RatingSectionProps) {
  const [userRating, setUserRating] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function loadRatingData() {
      const sessionId = getSessionId();
      if (!sessionId) return;

      // 并行获取评分统计和用户评分状态
      const [stats, rated] = await Promise.all([
        getResourceStats(resourceId),
        hasUserRated(resourceId, sessionId),
      ]);

      setAvgRating(stats.avgRating);
      setRatingCount(stats.ratingCount);
      setHasRated(rated);
    }

    loadRatingData();
  }, [resourceId]);

  const handleRating = async (rating: number) => {
    if (hasRated || isSubmitting) return;

    const sessionId = getSessionId();
    if (!sessionId) {
      alert("无法获取会话信息，请刷新页面重试");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitRating(resourceId, rating, sessionId);
      if (result.success) {
        setUserRating(rating);
        setHasRated(true);
        // 更新平均评分
        const stats = await getResourceStats(resourceId);
        setAvgRating(stats.avgRating);
        setRatingCount(stats.ratingCount);
      } else {
        alert(result.error || "评分失败，请稍后重试");
      }
    } catch (error) {
      console.error("评分失败:", error);
      alert("评分失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-[#10213E]">用户评分</h3>

      {/* 星级评分 */}
      <div className="mb-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            const filled = hasRated
              ? starValue <= (userRating || avgRating)
              : starValue <= (hoveredRating || avgRating);

            return (
              <button
                key={i}
                onClick={() => handleRating(starValue)}
                onMouseEnter={() => !hasRated && setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                disabled={hasRated || isSubmitting}
                className={`text-2xl transition-all ${
                  hasRated
                    ? "cursor-default"
                    : "cursor-pointer hover:scale-110"
                } ${filled ? "text-[#E63946]" : "text-[#E2E8F0]"}`}
                aria-label={`${starValue}星评分`}
              >
                ★
              </button>
            );
          })}
        </div>

        {/* 评分提示 */}
        {!hasRated && (
          <p className="mt-2 text-sm text-[#64748B]">
            点击星星进行评分（匿名评分）
          </p>
        )}
        {hasRated && (
          <p className="mt-2 text-sm text-[#059669]">
            感谢您的评分！
          </p>
        )}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-[#64748B]">
        <div>
          平均评分：<span className="font-semibold text-[#10213E]">{avgRating.toFixed(1)}</span>
        </div>
        <div>
          评分人数：<span className="font-semibold text-[#10213E]">{ratingCount}</span>
        </div>
      </div>
    </div>
  );
}