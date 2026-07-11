import { getDomainById } from "@/lib/constants";
import { type CandidateBookRecommendation } from "./types";

interface RecommendationRecordsProps {
  recommendations: CandidateBookRecommendation[];
  onClear: () => void;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecommendationRecords({ recommendations, onClear }: RecommendationRecordsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="border-l border-[#E5E7EB]/25 pl-4 text-sm leading-6 text-[#9CA3AF]">
        暂无本地推荐记录。提交成功后，记录会显示在这里。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[#D1D5DB]">
          当前共有 {recommendations.length} 条本地候选推荐记录。
        </p>
        <button
          type="button"
          onClick={onClear}
          className="border border-[#E5E7EB]/25 px-3 py-1.5 text-xs font-semibold text-[#9CA3AF] transition hover:border-[#E63946] hover:text-[#F7F7F8]"
        >
          清空本地记录
        </button>
      </div>

      <ul className="space-y-4">
        {recommendations.map((recommendation) => {
          const domain = getDomainById(recommendation.domainId);

          return (
            <li key={recommendation.id} className="border-t border-[#E5E7EB]/15 pt-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                {domain ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: domain.color }} />
                    {domain.name}
                  </span>
                ) : (
                  <span>领域未识别</span>
                )}
                <span>推荐指数 {recommendation.rating}/5</span>
                <span>{formatCreatedAt(recommendation.createdAt)}</span>
              </div>
              <p className="font-semibold leading-6 text-[#F7F7F8]">{recommendation.title}</p>
              <p className="mb-2 text-xs leading-5 text-[#9CA3AF]">{recommendation.author}</p>
              <p className="mb-3 text-sm leading-6 text-[#D1D5DB]">{recommendation.reason}</p>
              <p className="border-l border-[#E5E7EB]/25 pl-3 text-xs leading-5 text-[#9CA3AF]">
                状态：本地已保存，待人工判断
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
