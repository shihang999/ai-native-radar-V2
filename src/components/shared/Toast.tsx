"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastCallback: ((toast: Toast) => void) | null = null;

/**
 * 全局 Toast 通知组件
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastCallback = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);

      // 3 秒后自动消失
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };

    return () => {
      toastCallback = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-in slide-in-from-right-5 fade-in-0 zoom-in-95 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-[#00524C] bg-[#00524C]/10"
              : toast.type === "error"
              ? "border-[#EF4444] bg-[#EF4444]/10"
              : "border-[#5DB2E2] bg-[#5DB2E2]/10"
          }`}
        >
          {/* 图标 */}
          {toast.type === "success" && (
            <svg className="h-5 w-5 text-[#00524C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === "error" && (
            <svg className="h-5 w-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.type === "info" && (
            <svg className="h-5 w-5 text-[#5DB2E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}

          {/* 消息 */}
          <p className={`text-sm font-medium ${
            toast.type === "success"
              ? "text-[#00524C]"
              : toast.type === "error"
              ? "text-[#EF4444]"
              : "text-[#5DB2E2]"
          }`}>
            {toast.message}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * 显示 Toast 通知
 */
export function showToast(message: string, type: ToastType = "info") {
  if (toastCallback) {
    const toast: Toast = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
    };
    toastCallback(toast);
  }
}