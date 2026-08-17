# 审核 SOP v1.0 — AI 推荐录入三模式上线版

> 唯一真源：本 SOP + `context/枚举字典-当前版本.md`（枚举 ID/名称永久冻结，不可私自改 Supabase 表）。
> 审核界面：仅使用 Supabase Dashboard 的 SQL Editor，执行下面 4 个 `vw_` 开头的视图查询即可，无需做后台 UI。
> 质量原则：**宁可放过 10 条低质，也不误杀 1 条有价值推荐**。有任何歧义 → 留。

---

## 0. 先把 2 个 migration 执行完（一次即可）

1. Supabase Dashboard → SQL Editor → New Query
2. 依次粘贴并运行：
   1. `supabase/migrations/2026081801_enum_domains_rings_defaults.sql`（枚举兜底，幂等）
   2. `supabase/migrations/2026081802_ai_recommendation_schema_extension.sql`（扩列 + 约束 + 审核视图，幂等）
3. 运行完刷新左侧表树，确认：
   - `domains` 有 8 行、`rings` 有 3 行，ID 与 `constants.ts DOMAINS/RINGS` 一致；
   - `user_recommendations` 新增列 `input_mode/source/batch_id/.../reject_reason_*`；
   - Views 下能看到 `vw_pending_recommendations` 等 4 个视图。

---

## 1. 审核流水线（每日常规 3 步）

### Step 1：打开待审核队列
```sql
SELECT * FROM vw_pending_recommendations ORDER BY created_at ASC;
```
这个视图已经把 `resources`（资源主表）和 `user_recommendations` join 好，并拼出了 `resource_type_name / domain_name / ring_name`、`confidence_low_fields`（置信度 <0.65 的字段，用逗号分隔）。

- 列 `parse_status_hint`：若是 AI 解析失败仍由用户手工补提交的，会显示 `parse_empty / ocr_failed / asr_failed` 等，人工审核要额外重点看一下。
- 列 `recommender_name_submitted`：可空，用户留的任意昵称，入库已做 HTML 转义 + ≤50 字截断，直接展示即可。

### Step 2：重复候选提示（供参考，不拦截）
```sql
SELECT * FROM vw_pending_with_duplicate_candidates ORDER BY similarity DESC NULLS LAST;
```
- `similarity` 是基于 `pg_trgm` 的标题相似（0~1），>0.8 的是**疑似重复**，但绝不自动拦截；
- 审核决策：重复的话，依然**两条都通过**（保留历史推荐人、留名、时间），`linked_resource_id` 指到同一个 resources.id 即可。
- 操作：
  - 决定通过：把 `user_recommendations.status` 从 `pending` 改为 `approved`，若命中重复，就把 `linked_resource_id` 更新为已存在的那条的 resources.id；
  - 决定驳回：把 status 改为 `rejected`，并**务必填** `reject_reason_category`（枚举 6 类）+ `reject_reason_detail`（自由文本，中文）。

### Step 3：核对解析原文（当用户改得太离谱 / 标题疑似错误时）
```sql
SELECT * FROM vw_ai_parsed_raw_compare ORDER BY created_at DESC LIMIT 50;
```
这个视图把 `raw_text_snapshot / ocr_text_snapshot / ai_field_confidence` 和最终提交的结构化字段并排展示。

- 若 AI 填错了领域/阶段 → 人工改回 `user_recommendations` 对应字段；
- 若 `raw_text_snapshot` 里有广告/无意义字符 → 直接驳回 `category=not_a_recommendation`。

### Step 4：周维度驳回统计（每周一 15min）
```sql
SELECT * FROM vw_reject_reason_stats ORDER BY count DESC;
```
看哪一类驳回占比 >30%：
- `ai_domain_mismatch` → 调 Prompt（改 `docs/ai-prompt-v1.md`）；
- `ocr_failed_multiple_books` → 一次减少上传张数、或增加人工补全提示；
- `not_a_recommendation` → 前端引导文案需强化（不在本次 scope）。

---

## 2. 驳回分类 6 类（永久冻结，与 `types.ts RejectReasonCategory` 保持一致）

| category（id） | 何时选 |
|---|---|
| `not_a_recommendation` | 不是推荐内容（纯广告、无意义字符、聊天记录） |
| `ai_domain_mismatch` | AI 把领域/阶段分类错了，人工纠正成本过高（超过 3 个字段） |
| `ocr_failed_multiple_books` | OCR 识别质量太差，拆不出来本数、或本数错误 3 本以上 |
| `spam_or_duplicate` | 完全重复复制粘贴/同 1 条提交多次（注意：仍保留，不要删数据，只是驳回） |
| `incomplete_required_fields` | 标题/理由/领域/阶段 缺失且无法人工补全 |
| `other` | 以上都不是，必须写 `reject_reason_detail` |

> ⚠️ 任何驳回都不会物理删除，`status=rejected` 一直保留，可随时恢复为 `pending` 再通过。

---

## 3. 通过 / 驳回操作 SQL 模板

### 通过单条（无重复资源）
```sql
UPDATE user_recommendations
SET status = 'approved',
    linked_resource_id = (
        -- 若 resources 表已有同名/同链接的，可直接复用 id
        SELECT id FROM resources
        WHERE title = (SELECT resource_title FROM vw_pending_recommendations WHERE user_rec_id = '<rec_id>')
        LIMIT 1
    ),
    updated_at = now()
WHERE id = '<rec_id>' AND status = 'pending';
```

### 通过单条并指定已存在资源 linked_resource_id
```sql
UPDATE user_recommendations
SET status = 'approved',
    linked_resource_id = '<existing_resource_id>',
    updated_at = now()
WHERE id = '<rec_id>';
```

### 驳回单条
```sql
UPDATE user_recommendations
SET status = 'rejected',
    reject_reason_category = 'ai_domain_mismatch', -- 6 类之一
    reject_reason_detail = 'AI 把「AI 基础」错判成「产品应用」，且理由正文和领域严重不符',
    updated_at = now()
WHERE id = '<rec_id>';
```

---

## 4. 合规红线（审核端不可越界）

- **绝对不要**修改 `raw_text_snapshot / ocr_text_snapshot / audio_metadata` 字段；这是审核对照用快照，只允许读。
- **绝对不要**回写任何用户信息到别的表；匿名是产品承诺。
- 若审核发现《未成年人保护法》《网络安全法》明确违规内容：驳回 `category=other` 并把 detail 写清楚即可，**不要**外发或转发原始内容。
- 图片 / 语音原始文件在识别完成后立即删除，Supabase 表内不存在；如果需要复核只能看 `ocr_text_snapshot` 或 `audio_metadata`。

---

## 5. 发布后的前 2 周审核节奏

- **每日上午 10:00**：跑 Step 1~3，把昨天积压的 `pending` 全部批掉（预计 < 5 min / 天）。
- **每周二 10:30**：跑 Step 4，看驳回类别分布，若某类 >30%，触发 Prompt / 前端提示优化。
- 2 周过后审核量稳定：可降为每 2 天批 1 次。
