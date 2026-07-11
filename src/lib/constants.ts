/** 书籍数据结构 */
export interface Book {
  id: string;
  title: string;
  author: string;
  domainId: string;
  ringId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

/** 领域定义：8 大象限，从 12 点钟方向顺时针排列 */
export interface Domain {
  id: string;
  name: string;
  color: string;
  angleStart: number;
  angleEnd: number;
}

/** 圈层定义：内圈入门 → 外圈高级 */
export interface RingDefinition {
  id: string;
  name: string;
  radiusRatio: number;
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
  { id: "ai-engineering", name: "AI 工程", color: "#2563EB", angleStart: -90, angleEnd: -45 },
  { id: "product-methodology", name: "产品方法论", color: "#7C3AED", angleStart: -45, angleEnd: 0 },
  { id: "agent-design", name: "Agent 设计", color: "#0891B2", angleStart: 0, angleEnd: 45 },
  { id: "org-change", name: "组织变革", color: "#059669", angleStart: 45, angleEnd: 90 },
  { id: "data-intelligence", name: "数据智能", color: "#D97706", angleStart: 90, angleEnd: 135 },
  { id: "business-landing", name: "商业落地", color: "#DC2626", angleStart: 135, angleEnd: 180 },
  { id: "ethics-governance", name: "伦理治理", color: "#4F46E5", angleStart: 180, angleEnd: 225 },
  { id: "frontier-trends", name: "前沿趋势", color: "#EC4899", angleStart: 225, angleEnd: 270 },
];

/** 3 个圈层 */
export const RINGS: RingDefinition[] = [
  { id: "beginner", name: "入门", radiusRatio: 0.33 },
  { id: "intermediate", name: "进阶", radiusRatio: 0.63 },
  { id: "advanced", name: "高级", radiusRatio: 0.91 },
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
  size: 600,
  /** 中心点 */
  centerX: 300,
  centerY: 300,
  /** 最外圈半径 */
  maxRadius: 240,
  /** blip 默认半径 */
  blipRadius: 6,
} as const;

/** 根据领域 ID 查找领域定义 */
export function getDomainById(id: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === id);
}

/** 根据圈层 ID 查找圈层定义 */
export function getRingById(id: string): RingDefinition | undefined {
  return RINGS.find((r) => r.id === id);
}
