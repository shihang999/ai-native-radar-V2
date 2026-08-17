-- ================================================================
-- 枚举字典兜底初始化：若 domains/rings 为空则初始化默认 8 领域 + 3 阶段
-- 一旦执行完毕永久冻结 ID，禁止后续修改本文件中的 ID 和 name。
-- 执行：Supabase Dashboard → SQL Editor → 新建查询 → 粘贴 → 运行。
-- ================================================================

-- 3 个学习阶段 rings
INSERT INTO rings (id, name, radius_range, sort_order) VALUES
  ('beginner',     '入门', '0.00-0.33', 1),
  ('intermediate', '进阶', '0.34-0.66', 2),
  ('advanced',     '高级', '0.67-1.00', 3)
ON CONFLICT (id) DO NOTHING;

-- 8 大领域 domains
INSERT INTO domains (id, name, color, sort_order) VALUES
  ('ai-fundamentals',     'AI 基础与原理',         '#2563EB', 1),
  ('ai-engineering',      'AI 工程',               '#0891B2', 2),
  ('ai-product-method',   'AI 产品与方法',         '#7C3AED', 3),
  ('agent-systems',       'Agent 与智能系统',      '#EC4899', 4),
  ('data-intelligence',   '数据智能',              '#D97706', 5),
  ('business-landing',    '商业落地',              '#DC2626', 6),
  ('org-change',          '组织与变革',            '#059669', 7),
  ('ethics-governance',   '伦理、治理与社会影响',   '#4F46E5', 8)
ON CONFLICT (id) DO NOTHING;
