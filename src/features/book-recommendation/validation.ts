import { DOMAINS } from "@/lib/constants";
import {
  type BookRecommendationErrors,
  type BookRecommendationFormValues,
  type RecommendationRating,
} from "./types";

const MIN_REASON_LENGTH = 20;
const VALID_RATINGS: RecommendationRating[] = [1, 2, 3, 4, 5];

function visibleLength(value: string): number {
  return value.trim().replace(/\s+/g, "").length;
}

export function validateRecommendationForm(
  values: BookRecommendationFormValues,
): BookRecommendationErrors {
  const errors: BookRecommendationErrors = {};
  const title = values.title.trim();
  const author = values.author.trim();
  const reason = values.reason.trim();

  if (!title) {
    errors.title = "请输入书名";
  }

  if (!author) {
    errors.author = "请输入作者";
  }

  if (!values.domainId || !DOMAINS.some((domain) => domain.id === values.domainId)) {
    errors.domainId = "请选择所属领域";
  }

  if (!values.rating || !VALID_RATINGS.includes(values.rating)) {
    errors.rating = "请选择推荐指数";
  }

  if (!reason) {
    errors.reason = "请说明推荐理由";
  } else if (visibleLength(reason) < MIN_REASON_LENGTH) {
    errors.reason = `推荐理由至少 ${MIN_REASON_LENGTH} 个中文字符`;
  }

  return errors;
}

export function hasRecommendationErrors(errors: BookRecommendationErrors): boolean {
  return Object.keys(errors).length > 0;
}
