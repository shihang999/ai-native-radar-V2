"use client";

import { useEffect, useRef } from "react";
import { type Book, getDomainById, getRingById } from "@/lib/constants";

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
}

export function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const domain = getDomainById(book.domainId);
  const ring = getRingById(book.ringId);

  // 按 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-[#1A1A2E] border border-[#E5E7EB]/20 rounded-xl shadow-2xl"
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#F7F7F8] transition-colors"
          aria-label="关闭"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="p-6">
          {/* 领域和阶段标签 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] mb-3">
            {domain && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#E5E7EB]/5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: domain.color }}
                />
                {domain.name}
              </span>
            )}
            {ring && (
              <span className="px-2 py-1 rounded-full bg-[#E5E7EB]/5">
                {ring.name}
              </span>
            )}
          </div>

          {/* 书名 */}
          <h2
            id="modal-title"
            className="text-xl font-semibold text-[#F7F7F8] mb-2"
          >
            {book.title}
          </h2>

          {/* 作者 */}
          <p className="text-sm text-[#9CA3AF] mb-4">{book.author}</p>

          {/* 推荐指数 */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-[#9CA3AF]">推荐指数</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-lg ${
                    i < book.rating ? "text-[#E63946]" : "text-[#E5E7EB]/20"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-semibold text-[#F7F7F8]">
              {book.rating}/5
            </span>
          </div>

          {/* 推荐理由 */}
          <div className="border-t border-[#E5E7EB]/10 pt-4">
            <h3 className="text-sm font-semibold text-[#F7F7F8] mb-2">
              推荐理由
            </h3>
            <p className="text-sm leading-6 text-[#D1D5DB]">{book.reason}</p>
          </div>

          {/* 资料链接 */}
          <div className="mt-4 border-t border-[#E5E7EB]/10 pt-4">
            <h3 className="text-sm font-semibold text-[#F7F7F8] mb-2">
              资料链接
            </h3>
            {book.resourceUrl ? (
              <a
                href={book.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#5DB2E2] hover:underline break-all"
              >
                {book.resourceUrl}
              </a>
            ) : (
              <p className="text-sm leading-6 text-[#9CA3AF]">无</p>
            )}
          </div>

          {/* 领域描述 */}
          {domain && (
            <div className="mt-4 border-t border-[#E5E7EB]/10 pt-4">
              <h3 className="text-sm font-semibold text-[#F7F7F8] mb-2">
                领域说明
              </h3>
              <p className="text-sm leading-6 text-[#9CA3AF]">
                {domain.description}
              </p>
            </div>
          )}

          {/* 阶段说明 */}
          {ring && (
            <div className="mt-4 border-t border-[#E5E7EB]/10 pt-4">
              <h3 className="text-sm font-semibold text-[#F7F7F8] mb-2">
                学习阶段
              </h3>
              <p className="text-sm leading-6 text-[#9CA3AF]">
                {ring.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
