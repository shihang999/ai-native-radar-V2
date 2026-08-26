/**
 * 雷达版本历史（mock）
 * 用于首页雷达右侧版本时间线展示，数据为示意 mock。
 * 说明：当前不具备历史快照存储，addedBookIds 用于在「当前雷达点位」上高亮
 * 该版本相对上一版新增的点位；真实历史点位集合待后续快照能力补齐。
 */

export interface RadarVersion {
  id: string;
  /** 版本号，如 v1.3 */
  label: string;
  /** 发布日期 YYYY-MM-DD */
  date: string;
  /** 版本简述 */
  summary: string;
  /** 是否为当前线上版本（时间线节点高亮） */
  isCurrent: boolean;
  /** 该版本相对上一版新增的资源 id（用于雷达点位高亮，可为空） */
  addedBookIds: string[];
}

/**
 * 版本列表：按时间倒序（最新在前，时间线最上方为最新）。
 * isCurrent 标记当前线上版本。
 */
export const RADAR_VERSIONS: RadarVersion[] = [
  {
    id: "v1-3",
    label: "v1.3",
    date: "2026-08-24",
    summary: "新增 Agent 与数据智能领域代表作，补充进阶圈层点位。",
    isCurrent: true,
    addedBookIds: [],
  },
  {
    id: "v1-2",
    label: "v1.2",
    date: "2026-07-30",
    summary: "上线编辑高分推荐，调整 AI 工程领域点位分布。",
    isCurrent: false,
    addedBookIds: [],
  },
  {
    id: "v1-1",
    label: "v1.1",
    date: "2026-07-02",
    summary: "扩充商业落地与组织变革领域，新增多本入门读物。",
    isCurrent: false,
    addedBookIds: [],
  },
  {
    id: "v1-0",
    label: "v1.0",
    date: "2026-06-10",
    summary: "首个版本发布，覆盖 8 大知识领域的核心代表书籍。",
    isCurrent: false,
    addedBookIds: [],
  },
];
