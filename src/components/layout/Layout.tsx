"use client";

import { Header } from "./Header";
import { FloatingButton } from "@/components/shared/FloatingButton";
import { RecommendDrawer } from "@/components/shared/RecommendDrawer";
import { ToastContainer } from "@/components/shared/Toast";

/**
 * 全局布局组件
 * 包含导航栏、浮动推荐按钮和推荐抽屉
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FFFFFF]">{children}</main>
      <FloatingButton />
      <RecommendDrawer />
      <ToastContainer />
    </>
  );
}