-- ================================================================
-- AI 智能录入三模式改造 · 数据层 migration
-- 目标：
-- 1. user_recommendations 扩列（input_mode/source/batch_id/快照/审核标签）
-- 2. 移除邀请码必填校验（列 invite_code 本身保留作历史兼容，但移除 NOT NULL/校验）
-- 3. 加 resource_type 三类 CHECK 强约束
-- 4. 创建 4 张审核用 SQL 视图（Supabase Dashboard 直接可见可用）
-- 执行：Supabase Dashboard → SQL Editor → 新建查询 → 粘贴 → 运行。
-- 注意：所有新字段均为可空兼容老数据，禁止 drop 任何旧列。
-- ================================================================

-- 1) 加 input_mode 列（四种录入模式）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'input_mode'
  ) THEN
    ALTER TABLE user_recommendations
      ADD COLUMN input_mode TEXT NOT NULL DEFAULT 'manual'
      CHECK (input_mode IN ('text', 'image', 'voice', 'manual'));
  END IF;
END $$;

-- 2) 加 source 列（AI解析 vs 手工）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'source'
  ) THEN
    ALTER TABLE user_recommendations
      ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
      CHECK (source IN ('ai_parsed', 'manual'));
  END IF;
END $$;

-- 3) 批次 batch_id：同一次粘贴/图片/语音解析提交出的 N 本书共享一个 UUID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN batch_id TEXT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_user_recommendations_batch_id
  ON user_recommendations(batch_id);

-- 4) 原始文本快照（文本原文 / 语音 ASR 原文）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'raw_text_snapshot'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN raw_text_snapshot TEXT;
  END IF;
END $$;

-- 5) OCR 文本快照（图片模式下多模态抽出的纯文本）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'ocr_text_snapshot'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN ocr_text_snapshot TEXT;
  END IF;
END $$;

-- 6) 音频元信息 jsonb：时长/语言/文件大小（不存原始音频）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'audio_metadata'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN audio_metadata JSONB;
  END IF;
END $$;

-- 7) 提交时用户填的推荐人昵称（可空，也可以直接复用旧 recommender 列）
--    说明：如果 recommender 已经够用，则本列在代码中不强制使用；
--    这里仍保留一个显式字段语义，方便后续审核端查询
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'recommender_name_submitted'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN recommender_name_submitted TEXT;
  END IF;
END $$;

-- 8) AI 字段置信度 jsonb（每个字段 0~1）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'ai_field_confidence'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN ai_field_confidence JSONB;
  END IF;
END $$;

-- 9) 合并到已上架资源：审核端操作时写 linked_resource_id
--    注意：resources.id 在老库中可能是 UUID，这里统一用 TEXT 以兼容；
--    若类型不兼容则退化为"仅加列不加 FK"，后续审核端仍然能按文本 JOIN。
DO $$
DECLARE
  _id_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'linked_resource_id'
  ) THEN
    SELECT data_type INTO _id_type
    FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'id';

    IF _id_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE user_recommendations ADD COLUMN linked_resource_id UUID
        REFERENCES resources(id) ON DELETE SET NULL';
    ELSE
      BEGIN
        EXECUTE 'ALTER TABLE user_recommendations ADD COLUMN linked_resource_id TEXT
          REFERENCES resources(id) ON DELETE SET NULL';
      EXCEPTION WHEN OTHERS THEN
        ALTER TABLE user_recommendations ADD COLUMN linked_resource_id TEXT;
      END;
    END IF;
  END IF;
END $$;

-- 10) 驳回原因分类 + 详情
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'reject_reason_category'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN reject_reason_category TEXT
      CHECK (reject_reason_category IN (
        'insufficient_info', 'wrong_fields', 'duplicate',
        'low_quality', 'recommender_invalid', 'other'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_recommendations' AND column_name = 'reject_reason_detail'
  ) THEN
    ALTER TABLE user_recommendations ADD COLUMN reject_reason_detail TEXT;
  END IF;
END $$;

-- 11) resource_type 三类强约束（若已存在 DO 块会跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_recommendations_resource_type_check'
      AND table_name = 'user_recommendations'
  ) THEN
    ALTER TABLE user_recommendations ADD CONSTRAINT user_recommendations_resource_type_check
      CHECK (resource_type IN ('book','course','article'));
  END IF;
END $$;

-- 12) resources 表也加同样的 resource_type 三类约束，保持一致
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'resources_resource_type_check'
      AND table_name = 'resources'
  ) THEN
    ALTER TABLE resources ADD CONSTRAINT resources_resource_type_check
      CHECK (resource_type IN ('book','course','article'));
  END IF;
END $$;

-- ================================================================
-- 4 张审核视图（vw_ 前缀，Supabase Dashboard 左侧直接可见）
-- ================================================================

-- View 1：待审总览列表（按 input_mode / 留名 / 时间倒序）
CREATE OR REPLACE VIEW vw_pending_recommendations AS
SELECT
  ur.id,
  ur.created_at,
  ur.input_mode,
  ur.source,
  CASE WHEN ur.recommender IS NOT NULL AND btrim(ur.recommender) <> ''
       THEN TRUE ELSE FALSE END AS has_recommender,
  ur.recommender                               AS recommender_raw,
  ur.recommender_name_submitted,
  ur.title,
  ur.resource_type,
  ur.domain_id,
  ur.ring_id,
  ur.rating,
  left(ur.reason, 80)                         AS reason_excerpt,
  (ur.ai_field_confidence ->> 'overall')::float AS overall_confidence,
  ur.status
FROM user_recommendations ur
WHERE ur.status = 'pending'
ORDER BY ur.created_at DESC;

-- View 2：待审 + 疑似重复候选（Top 3 已上架 + Top 3 待审相似候选）
CREATE OR REPLACE VIEW vw_pending_with_duplicate_candidates AS
WITH base AS (
  SELECT ur.id, ur.title, ur.domain_id, ur.ring_id, ur.resource_type, ur.isbn
  FROM user_recommendations ur
  WHERE ur.status = 'pending'
)
SELECT
  b.id                                       AS user_recommendation_id,
  b.title                                    AS pending_title,
  b.domain_id                                AS pending_domain_id,
  b.ring_id                                  AS pending_ring_id,
  -- 已上架资源里最像的 Top3（基于标题相似度 + 同领域）
  (SELECT json_agg(json_build_object(
     'resource_id', r.id,
     'title', r.title,
     'domain_id', r.domain_id,
     'ring_id', r.ring_id,
     'similarity', similarity(b.title, r.title)
   ) ORDER BY similarity(b.title, r.title) DESC)
     FROM resources r
    WHERE r.status = 'approved'
      AND similarity(b.title, r.title) > 0.25
      AND (b.domain_id IS NULL OR r.domain_id = b.domain_id)
    LIMIT 3)                                 AS top_approved_candidates,
  -- 待审池内部互相像的 Top3
  (SELECT json_agg(json_build_object(
     'ur_id', ur2.id,
     'title', ur2.title,
     'created_at', ur2.created_at,
     'similarity', similarity(b.title, ur2.title)
   ) ORDER BY similarity(b.title, ur2.title) DESC)
     FROM user_recommendations ur2
    WHERE ur2.status = 'pending'
      AND ur2.id <> b.id
      AND similarity(b.title, ur2.title) > 0.3
    LIMIT 3)                                 AS top_pending_candidates
FROM base b
ORDER BY b.id;

-- View 3：AI 解析原始内容对照（审核员快速对比：结构化字段 vs 原文 vs OCR vs ASR）
CREATE OR REPLACE VIEW vw_ai_parsed_raw_compare AS
SELECT
  ur.id,
  ur.created_at,
  ur.input_mode,
  ur.source,
  -- 结构化
  ur.title,
  ur.author,
  ur.resource_type,
  ur.resource_url,
  ur.domain_id,
  ur.ring_id,
  ur.rating,
  ur.reason,
  ur.recommender,
  ur.recommender_name_submitted,
  -- 置信度
  ur.ai_field_confidence,
  -- 原始快照对照
  ur.raw_text_snapshot,
  ur.ocr_text_snapshot,
  ur.audio_metadata,
  -- 批次（同一批次多条并排审）
  ur.batch_id,
  ur.status
FROM user_recommendations ur
ORDER BY ur.created_at DESC;

-- View 4：驳回原因统计（按 input_mode × 驳回分类聚合，周维度可筛）
CREATE OR REPLACE VIEW vw_reject_reason_stats AS
SELECT
  date_trunc('week', ur.reviewed_at)       AS week,
  ur.input_mode,
  ur.reject_reason_category,
  COUNT(*)                                   AS total,
  array_agg(ur.id ORDER BY ur.created_at)    AS ur_ids
FROM user_recommendations ur
WHERE ur.status = 'rejected'
  AND ur.reviewed_at IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;
