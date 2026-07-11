import { type SubmitStatus } from "./types";

interface SubmitFeedbackProps {
  status: SubmitStatus;
  message: string;
}

export function SubmitFeedback({ status, message }: SubmitFeedbackProps) {
  if (!message || status === "idle" || status === "submitting") {
    return null;
  }

  const isError = status === "error";

  return (
    <div
      className={`mb-5 border-l-2 px-4 py-3 text-sm leading-6 ${
        isError
          ? "border-[#E63946] bg-[#E63946]/10 text-[#FCA5A5]"
          : "border-[#E5E7EB]/60 bg-[#F7F7F8]/[0.04] text-[#D1D5DB]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {message}
    </div>
  );
}
