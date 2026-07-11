import { RadarChart } from "@/components/radar/RadarChart";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-[#F7F7F8] mb-2">AI-Native 读书雷达</h1>
      <p className="text-[#6B7280] text-sm mb-10 text-center max-w-[680px]">
        AI 从业者共建的动态读书雷达 — 按领域与难度定位你的下一本 AI 书
      </p>
      <RadarChart />
    </main>
  );
}
