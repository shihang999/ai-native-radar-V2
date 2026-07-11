export type RecommendationRating = 1 | 2 | 3 | 4 | 5;

export interface CandidateBookRecommendation {
  id: string;
  title: string;
  author: string;
  domainId: string;
  rating: RecommendationRating;
  reason: string;
  status: "local_saved";
  createdAt: string;
}

export interface BookRecommendationFormValues {
  title: string;
  author: string;
  domainId: string;
  rating: RecommendationRating | "";
  reason: string;
}

export type BookRecommendationField = keyof BookRecommendationFormValues;

export type BookRecommendationErrors = Partial<Record<BookRecommendationField, string>>;

export type SubmitStatus = "idle" | "submitting" | "success" | "error";
