/**
 * 榜单历史快照（mock）
 * 用于榜单卡片右上角「历史榜单」入口展示，数据为示意 mock。
 * 后续可替换为真实历史快照接口。
 */

/** 三个榜单标识 */
export type RankingKey = "new-this-week" | "trending-this-week" | "top-rated";

/** 榜单卡片渲染所需的精简条目结构 */
export interface RankingHistoryItem {
  id: string;
  title: string;
  author: string | null;
  domainId: string;
}

/** 一期历史榜单快照 */
export interface RankingHistoryPeriod {
  /** 期次标识 */
  id: string;
  /** 期次展示名（如「本周」「上上周」「2026-06」） */
  label: string;
  /** 该期榜单条目 */
  items: RankingHistoryItem[];
}

/**
 * 各榜单的历史期次（mock，每个榜单 3 期，按时间由近到远）
 * domainId 使用 constants 中真实领域 id，以便正常显示领域色点。
 */
export const RANKING_HISTORY: Record<RankingKey, RankingHistoryPeriod[]> = {
  "new-this-week": [
    {
      id: "new-w1",
      label: "上周",
      items: [
        { id: "lw-new-1", title: "生成式 AI 实践指南", author: "李明", domainId: "ai-engineering" },
        { id: "lw-new-2", title: "大模型时代的产品设计", author: "王芳", domainId: "ai-product-method" },
        { id: "lw-new-3", title: "智能体系统入门", author: "陈磊", domainId: "agent-systems" },
        { id: "lw-new-4", title: "数据驱动决策", author: "赵敏", domainId: "data-intelligence" },
        { id: "lw-new-5", title: "AI 伦理十二讲", author: "孙洁", domainId: "ethics-governance" },
      ],
    },
    {
      id: "new-w2",
      label: "上上周",
      items: [
        { id: "w2-new-1", title: "深度学习入门：基于 Python", author: "斋藤康毅", domainId: "ai-fundamentals" },
        { id: "w2-new-2", title: "AI 产品设计实战", author: "周琳", domainId: "ai-product-method" },
        { id: "w2-new-3", title: "企业级 RAG 系统构建", author: "杨帆", domainId: "ai-engineering" },
        { id: "w2-new-4", title: "多智能体协作实践", author: "何磊", domainId: "agent-systems" },
        { id: "w2-new-5", title: "数据治理与智能分析", author: "郑爽", domainId: "data-intelligence" },
      ],
    },
    {
      id: "new-w3",
      label: "三周前",
      items: [
        { id: "w3-new-1", title: "大语言模型应用开发", author: "刘洋", domainId: "ai-engineering" },
        { id: "w3-new-2", title: "AI 落地的组织变革", author: "张倩", domainId: "org-change" },
        { id: "w3-new-3", title: "可信 AI 与合规实践", author: "王涛", domainId: "ethics-governance" },
        { id: "w3-new-4", title: "商业智能与增长", author: "陈曦", domainId: "business-landing" },
        { id: "w3-new-5", title: "机器学习基础", author: "李航", domainId: "ai-fundamentals" },
      ],
    },
  ],
  "trending-this-week": [
    {
      id: "trend-w1",
      label: "上周",
      items: [
        { id: "lw-tr-1", title: "从零构建大语言模型", author: "Sebastian Raschka", domainId: "ai-engineering" },
        { id: "lw-tr-2", title: "提示工程实战", author: "林悦", domainId: "ai-product-method" },
        { id: "lw-tr-3", title: "AI 落地方法论", author: "黄鹏", domainId: "business-landing" },
        { id: "lw-tr-4", title: "智能体协作模式", author: "徐磊", domainId: "agent-systems" },
        { id: "lw-tr-5", title: "神经网络与深度学习", author: "邱锡鹏", domainId: "ai-fundamentals" },
      ],
    },
    {
      id: "trend-w2",
      label: "上上周",
      items: [
        { id: "w2-tr-1", title: "深度学习", author: "Ian Goodfellow", domainId: "ai-fundamentals" },
        { id: "w2-tr-2", title: "AI 产品经理手册", author: "刘强", domainId: "ai-product-method" },
        { id: "w2-tr-3", title: "机器学习工程实战", author: "Andriy Burkov", domainId: "ai-engineering" },
        { id: "w2-tr-4", title: "构建多智能体系统", author: "周涛", domainId: "agent-systems" },
        { id: "w2-tr-5", title: "AI 战略：企业转型", author: "李华", domainId: "business-landing" },
      ],
    },
    {
      id: "trend-w3",
      label: "三周前",
      items: [
        { id: "w3-tr-1", title: "人工智能：现代方法", author: "Stuart Russell", domainId: "ai-fundamentals" },
        { id: "w3-tr-2", title: "数据智能基础", author: "吴斌", domainId: "data-intelligence" },
        { id: "w3-tr-3", title: "组织的智能化变革", author: "张伟", domainId: "org-change" },
        { id: "w3-tr-4", title: "可信 AI 治理框架", author: "郑琳", domainId: "ethics-governance" },
        { id: "w3-tr-5", title: "AI 时代的组织重构", author: "何静", domainId: "org-change" },
      ],
    },
  ],
  "top-rated": [
    {
      id: "top-m1",
      label: "上月",
      items: [
        { id: "lm-top-1", title: "深度学习", author: "Ian Goodfellow", domainId: "ai-fundamentals" },
        { id: "lm-top-2", title: "人工智能：现代方法", author: "Stuart Russell", domainId: "ai-fundamentals" },
        { id: "lm-top-3", title: "机器学习工程实战", author: "Andriy Burkov", domainId: "ai-engineering" },
        { id: "lm-top-4", title: "AI 产品经理手册", author: "刘强", domainId: "ai-product-method" },
        { id: "lm-top-5", title: "构建多智能体系统", author: "周涛", domainId: "agent-systems" },
      ],
    },
    {
      id: "top-m2",
      label: "上上月",
      items: [
        { id: "m2-top-1", title: "从零构建大语言模型", author: "Sebastian Raschka", domainId: "ai-engineering" },
        { id: "m2-top-2", title: "神经网络与深度学习", author: "邱锡鹏", domainId: "ai-fundamentals" },
        { id: "m2-top-3", title: "AI 落地方法论", author: "黄鹏", domainId: "business-landing" },
        { id: "m2-top-4", title: "提示工程实战", author: "林悦", domainId: "ai-product-method" },
        { id: "m2-top-5", title: "可信 AI 治理框架", author: "郑琳", domainId: "ethics-governance" },
      ],
    },
    {
      id: "top-m3",
      label: "三月前",
      items: [
        { id: "m3-top-1", title: "机器学习基础", author: "李航", domainId: "ai-fundamentals" },
        { id: "m3-top-2", title: "数据智能基础", author: "吴斌", domainId: "data-intelligence" },
        { id: "m3-top-3", title: "AI 战略：企业转型", author: "李华", domainId: "business-landing" },
        { id: "m3-top-4", title: "组织的智能化变革", author: "张伟", domainId: "org-change" },
        { id: "m3-top-5", title: "多智能体协作实践", author: "何磊", domainId: "agent-systems" },
      ],
    },
  ],
};
