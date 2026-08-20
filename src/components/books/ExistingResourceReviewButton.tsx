"use client";

import type { ExistingResourceReviewPrefill } from "@/lib/recommendation-drawer";
import { openExistingResourceReview } from "@/lib/recommendation-drawer";

interface ExistingResourceReviewButtonProps {
  resource: ExistingResourceReviewPrefill;
}

export function ExistingResourceReviewButton({
  resource,
}: ExistingResourceReviewButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openExistingResourceReview(resource)}
      className="shrink-0 rounded-lg border border-[#5DB2E2] px-3 py-1.5 text-sm font-medium text-[#0369A1] transition hover:bg-[#5DB2E2]/10"
    >
      我要评价
    </button>
  );
}
