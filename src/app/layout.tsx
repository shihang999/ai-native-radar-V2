import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Native 读书雷达",
  description: "AI 从业者共建的动态读书雷达，通过主题领域、难度层级、推荐指数帮助用户快速发现值得读的 AI 相关内容",
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
