"use client";

import { Header } from "./Header";
import { RecommendDrawer } from "@/components/shared/RecommendDrawer";
import { ToastContainer } from "@/components/shared/Toast";

/**
 * 全局布局组件
 * 包含导航栏与页面主体
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FFFFFF]">{children}</main>
      <RecommendDrawer />
      <ToastContainer />
    </>
  );
}
