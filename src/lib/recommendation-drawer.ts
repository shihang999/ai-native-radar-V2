import type { Resource } from "@/lib/database.types";

export const OPEN_RECOMMEND_DRAWER_EVENT = "openRecommendDrawer";

export type ExistingResourceReviewPrefill = Pick<
  Resource,
  | "id"
  | "title"
  | "author"
  | "resource_type"
  | "resource_url"
  | "domain_id"
  | "ring_id"
>;

export interface OpenRecommendDrawerDetail {
  intent: "review-existing";
  resource: ExistingResourceReviewPrefill;
}

export function openExistingResourceReview(
  resource: ExistingResourceReviewPrefill,
): void {
  window.dispatchEvent(
    new CustomEvent<OpenRecommendDrawerDetail>(OPEN_RECOMMEND_DRAWER_EVENT, {
      detail: {
        intent: "review-existing",
        resource,
      },
    }),
  );
}
