"use client";

export function BookRecommendationSection() {
  return (
    <section id="recommend-book" className="scroll-mt-8">
      <div className="mb-6 max-w-[720px]">
        <p className="mb-3 text-xs font-semibold text-[#E63946]">候选推荐</p>
        <h2 className="mb-3 text-[#F7F7F8]">推荐一本书</h2>
        <p className="text-sm leading-6 text-[#9CA3AF]">
          提交你认为值得进入读书雷达候选池的书。推荐会保存在当前浏览器本地，不会自动进入正式雷达，也不代表审核通过。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="border border-[#E5E7EB]/20 bg-[#F7F7F8]/[0.03] p-5">
          <h3 className="mb-3 text-[#F7F7F8]">填写候选推荐</h3>
          <p className="text-sm leading-6 text-[#9CA3AF]">
            需要包含书名、作者、所属领域、推荐指数和推荐理由。推荐理由应说明长期价值或适合阶段。
          </p>
        </div>

        <div className="border border-[#E5E7EB]/15 p-5">
          <h3 className="mb-3 text-[#F7F7F8]">我的本地推荐记录</h3>
          <p className="text-sm leading-6 text-[#9CA3AF]">
            记录仅保存在当前浏览器。刷新后仍可查看，换设备、换浏览器或清理浏览器数据后不可恢复。
          </p>
        </div>
      </div>
    </section>
  );
}
