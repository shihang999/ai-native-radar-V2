import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Native 读书雷达",
  description: "AI 学习认知地图，通过知识领域、学习阶段、默认路径和推荐理由帮助用户理解从哪里开始读、下一步读什么。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
