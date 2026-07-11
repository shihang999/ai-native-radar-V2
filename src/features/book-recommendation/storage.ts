import { type CandidateBookRecommendation } from "./types";

export const BOOK_RECOMMENDATIONS_STORAGE_KEY = "ai-native-radar:book-recommendations";

function isRecommendation(value: unknown): value is CandidateBookRecommendation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as CandidateBookRecommendation;

  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.author === "string" &&
    typeof record.domainId === "string" &&
    [1, 2, 3, 4, 5].includes(record.rating) &&
    typeof record.reason === "string" &&
    record.status === "local_saved" &&
    typeof record.createdAt === "string"
  );
}

export function isStorageAvailable(): boolean {
  try {
    const testKey = `${BOOK_RECOMMENDATIONS_STORAGE_KEY}:test`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadRecommendations(): CandidateBookRecommendation[] {
  try {
    const rawValue = window.localStorage.getItem(BOOK_RECOMMENDATIONS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isRecommendation);
  } catch {
    return [];
  }
}

export function saveRecommendation(
  recommendation: CandidateBookRecommendation,
): CandidateBookRecommendation[] {
  const recommendations = [recommendation, ...loadRecommendations()];
  window.localStorage.setItem(BOOK_RECOMMENDATIONS_STORAGE_KEY, JSON.stringify(recommendations));
  return recommendations;
}

export function clearRecommendations(): void {
  window.localStorage.removeItem(BOOK_RECOMMENDATIONS_STORAGE_KEY);
}
