/** 书籍数据结构（保持兼容，映射到数据库 Resource 类型） */
export interface Book {
  id: string;
  title: string;
  author: string;
  domainId: string;
  ringId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reason: string;
  coverImageUrl?: string | null;
}

/** 推荐指数类型 */
export type RecommendationRating = 1 | 2 | 3 | 4 | 5;

/** 领域定义：8 大象限，从 12 点钟方向顺时针排列 */
export interface Domain {
  id: string;
  name: string;
  description: string;
  color: string;
  angleStart: number;
  angleEnd: number;
}

/** 圈层定义：内圈入门 → 外圈高级 */
export interface RingDefinition {
  id: string;
  name: string;
  description: string;
  radiusRatio: number;
}

/** 默认学习路径 */
export interface LearningPathStep {
  id: string;
  title: string;
  stage: string;
  description: string;
  bookIds: string[];
}

/** 推荐指数 → 透明度映射 */
export const RATING_OPACITY: Record<number, number> = {
  1: 0.25,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
};

/** 8 大领域，每象限 45°，从 -90°（12 点钟）开始顺时针 */
export const DOMAINS: Domain[] = [
  {
    id: "ai-fundamentals",
    name: "AI 基础与原理",
    description: "建立 AI 的基本概念、能力边界和长期判断框架。",
    color: "#2563EB",
    angleStart: -90,
    angleEnd: -45,
  },
  {
    id: "ai-engineering",
    name: "AI 工程",
    description: "理解模型、数据、部署和系统化交付的工程问题。",
    color: "#0891B2",
    angleStart: -45,
    angleEnd: 0,
  },
  {
    id: "ai-product-method",
    name: "AI 产品与方法",
    description: "把 AI 能力转化为用户价值、产品判断和落地方法。",
    color: "#7C3AED",
    angleStart: 0,
    angleEnd: 45,
  },
  {
    id: "agent-systems",
    name: "Agent 与智能系统",
    description: "理解工具调用、规划、记忆和多智能体协作等系统能力。",
    color: "#EC4899",
    angleStart: 45,
    angleEnd: 90,
  },
  {
    id: "data-intelligence",
    name: "数据智能",
    description: "掌握数据工程、数据治理和数据驱动智能系统的基础。",
    color: "#D97706",
    angleStart: 90,
    angleEnd: 135,
  },
  {
    id: "business-landing",
    name: "商业落地",
    description: "判断 AI 如何改变业务流程、组织能力和商业决策。",
    color: "#DC2626",
    angleStart: 135,
    angleEnd: 180,
  },
  {
    id: "org-change",
    name: "组织与变革",
    description: "理解 AI 对组织结构、管理方式和职业能力的影响。",
    color: "#059669",
    angleStart: 180,
    angleEnd: 225,
  },
  {
    id: "ethics-governance",
    name: "伦理、治理与社会影响",
    description: "识别 AI 风险、责任边界、治理机制和社会后果。",
    color: "#4F46E5",
    angleStart: 225,
    angleEnd: 270,
  },
];

/** 3 个圈层 */
export const RINGS: RingDefinition[] = [
  { id: "beginner", name: "入门", description: "建立基础概念和判断框架", radiusRatio: 0.33 },
  { id: "intermediate", name: "进阶", description: "连接方法、系统和实际场景", radiusRatio: 0.63 },
  { id: "advanced", name: "高级", description: "处理复杂系统、战略和治理问题", radiusRatio: 0.91 },
];

export const LEARNING_PATH: LearningPathStep[] = [
  {
    id: "start",
    stage: "起点",
    title: "先建立 AI 的基本认知",
    description: "先理解 AI 能力边界、核心概念和社会影响，避免直接被工具教程牵着走。",
    bookIds: ["trend-3", "ethics-1"],
  },
  {
    id: "foundation",
    stage: "第二步",
    title: "按工作目标进入能力分化",
    description: "工程、产品和数据是大多数 AI 从业者最常见的三条能力分支。",
    bookIds: ["ai-eng-1", "prod-1", "data-1"],
  },
  {
    id: "advanced",
    stage: "第三步",
    title: "进入智能系统和组织落地",
    description: "在具备基础判断后，再理解 Agent、商业落地、组织变革和治理问题。",
    bookIds: ["agent-2", "biz-2", "org-2"],
  },
];

/** 基础色板 */
export const COLORS = {
  background: "#1A1A2E",
  surface: "#F7F7F8",
  neutral1: "#6B7280",
  neutral2: "#E5E7EB",
  accent: "#E63946",
} as const;

/** 雷达图配置 */
export const RADAR_CONFIG = {
  /** SVG viewBox 尺寸（正方形） */
  size: 800,
  /** 中心点 */
  centerX: 400,
  centerY: 400,
  /** 最外圈半径 */
  maxRadius: 360,
  /** blip 默认半径（点位直径 16px） */
  blipRadius: 8,
  /** 外圆环半径（行星环直径 24px） */
  ringRadius: 12,
  /** 悬停缩略图半径（直径 48px） */
  hoverRadius: 24,
} as const;

/** 根据领域 ID 查找领域定义 */
export function getDomainById(id: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === id);
}

/** 根据圈层 ID 查找圈层定义 */
export function getRingById(id: string): RingDefinition | undefined {
  return RINGS.find((r) => r.id === id);
}
