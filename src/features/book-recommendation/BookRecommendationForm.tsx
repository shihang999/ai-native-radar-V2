import { DOMAINS } from "@/lib/constants";
import {
  type BookRecommendationErrors,
  type BookRecommendationFormValues,
  type RecommendationRating,
  type SubmitStatus,
} from "./types";

const RATINGS: RecommendationRating[] = [1, 2, 3, 4, 5];

interface BookRecommendationFormProps {
  values: BookRecommendationFormValues;
  errors: BookRecommendationErrors;
  submitStatus: SubmitStatus;
  onChange: (values: BookRecommendationFormValues) => void;
  onSubmit: () => void;
}

export function BookRecommendationForm({
  values,
  errors,
  submitStatus,
  onChange,
  onSubmit,
}: BookRecommendationFormProps) {
  const isSubmitting = submitStatus === "submitting";

  function updateValue<Key extends keyof BookRecommendationFormValues>(
    key: Key,
    value: BookRecommendationFormValues[Key],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label htmlFor="recommendation-title" className="mb-2 block text-sm font-semibold text-[#F7F7F8]">
          书名
        </label>
        <input
          id="recommendation-title"
          value={values.title}
          onChange={(event) => updateValue("title", event.target.value)}
          className="w-full border border-[#E5E7EB]/25 bg-transparent px-3 py-2 text-sm text-[#F7F7F8] outline-none transition placeholder:text-[#6B7280] focus:border-[#E63946]"
          placeholder="例如 Artificial Intelligence: A Guide for Thinking Humans"
          disabled={isSubmitting}
        />
        {errors.title ? <p className="mt-2 text-xs text-[#FCA5A5]">{errors.title}</p> : null}
      </div>

      <div>
        <label htmlFor="recommendation-author" className="mb-2 block text-sm font-semibold text-[#F7F7F8]">
          作者
        </label>
        <input
          id="recommendation-author"
          value={values.author}
          onChange={(event) => updateValue("author", event.target.value)}
          className="w-full border border-[#E5E7EB]/25 bg-transparent px-3 py-2 text-sm text-[#F7F7F8] outline-none transition placeholder:text-[#6B7280] focus:border-[#E63946]"
          placeholder="作者或主要作者"
          disabled={isSubmitting}
        />
        {errors.author ? <p className="mt-2 text-xs text-[#FCA5A5]">{errors.author}</p> : null}
      </div>

      <div>
        <label htmlFor="recommendation-domain" className="mb-2 block text-sm font-semibold text-[#F7F7F8]">
          所属领域
        </label>
        <select
          id="recommendation-domain"
          value={values.domainId}
          onChange={(event) => updateValue("domainId", event.target.value)}
          className="w-full border border-[#E5E7EB]/25 bg-[#1A1A2E] px-3 py-2 text-sm text-[#F7F7F8] outline-none transition focus:border-[#E63946]"
          disabled={isSubmitting}
        >
          <option value="">请选择领域</option>
          {DOMAINS.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
        {errors.domainId ? <p className="mt-2 text-xs text-[#FCA5A5]">{errors.domainId}</p> : null}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[#F7F7F8]">推荐指数</legend>
        <div className="grid grid-cols-5 gap-2">
          {RATINGS.map((rating) => {
            const isSelected = values.rating === rating;

            return (
              <button
                key={rating}
                type="button"
                onClick={() => updateValue("rating", rating)}
                className={`border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-[#E63946] bg-[#E63946]/12 text-[#F7F7F8]"
                    : "border-[#E5E7EB]/25 text-[#9CA3AF] hover:border-[#E63946] hover:text-[#F7F7F8]"
                }`}
                disabled={isSubmitting}
              >
                {rating}
              </button>
            );
          })}
        </div>
        {errors.rating ? <p className="mt-2 text-xs text-[#FCA5A5]">{errors.rating}</p> : null}
      </fieldset>

      <div>
        <label htmlFor="recommendation-reason" className="mb-2 block text-sm font-semibold text-[#F7F7F8]">
          推荐理由
        </label>
        <textarea
          id="recommendation-reason"
          value={values.reason}
          onChange={(event) => updateValue("reason", event.target.value)}
          className="min-h-32 w-full resize-y border border-[#E5E7EB]/25 bg-transparent px-3 py-2 text-sm leading-6 text-[#F7F7F8] outline-none transition placeholder:text-[#6B7280] focus:border-[#E63946]"
          placeholder="说明这本书的长期价值、适合阶段或它解决的认知问题。至少 20 个中文字符。"
          disabled={isSubmitting}
        />
        {errors.reason ? <p className="mt-2 text-xs text-[#FCA5A5]">{errors.reason}</p> : null}
      </div>

      <button
        type="submit"
        className="border border-[#E63946] px-4 py-2 text-sm font-semibold text-[#F7F7F8] transition hover:bg-[#E63946]/15 disabled:cursor-not-allowed disabled:border-[#6B7280] disabled:text-[#6B7280]"
        disabled={isSubmitting}
      >
        {isSubmitting ? "提交中" : "提交候选推荐"}
      </button>
    </form>
  );
}
