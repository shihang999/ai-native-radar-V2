# AI-Native 读书雷达 | 后端数据架构设计

## 文档定位

本文档定义「AI-Native 读书雷达」的后端数据架构、数据库设计、核心业务逻辑和 API 接口规范。

本文档引用并服从：
- `context/system-overview.md`
- `context/tech-design.md`
- `context/ux-design.md`

如需修改数据结构，应先更新本文档并经过评审。

---

## 一、整体架构概览

### 1.1 核心设计原则

| 原则 | 说明 |
|---|---|
| **匿名参与** | 统一邀请码 `1234`，无需注册登录即可推荐和评分 |
| **邀请码验证时机** | 仅在提交推荐和评分时验证，查看资源无需验证 |
| **资源多样化** | 支持书籍、在线课程/官方文档、文章/其他资料三种类型 |
| **审核制收录** | 所有用户推荐需管理员审核后才进入正式雷达 |
| **加权评分** | 采用贝叶斯加权平均避免小样本偏差 |
| **Supabase 托管** | 利用 Supabase PostgREST API 和实时订阅能力 |
| **MVP 简化** | 管理员直接在 Supabase Dashboard 审核操作，无需单独的管理后台 |

### 1.2 数据流架构图

```
用户提交推荐 → 验证邀请码 → 检查重复 → 去重提示/创建推荐记录
                                               ↓
                                        管理员审核
                                               ↓
                            ┌─────────────────┴─────────────────┐
                            ↓                                   ↓
                        审核通过                              审核拒绝
                            ↓                                   ↓
                  创建正式资源记录                          记录拒绝原因
                            ↓
                  用户评分、浏览、收藏
                            ↓
                  定时计算加权分、更新排行榜
                            ↓
                  雷达图渲染（本周上新、本月最火、观看最多、Top 10）
```

---

## 二、核心数据模型总览

### 2.1 表关系图

```
domains (领域)
  ↓ 1:N
resources (资源/书籍)
  ↓ 1:N          ↓ 1:N           ↓ 1:N
ratings (评分)   comments (评论)  reading_notes (读书笔记)
  ↓ 聚合
resource_stats (资源统计缓存)

user_recommendations (用户推荐)
  ↓ 审核通过后
resources (资源)

invite_codes (邀请码配置)
```

### 2.2 核心表职责

| 表名 | 职责 | 备注 |
|---|---|---|
| `domains` | 能力主题/领域定义 | 对应现有 DOMAINS 常量 |
| `rings` | 学习阶段圈层定义 | beginner/intermediate/advanced |
| `resources` | 正式资源库 | 替代原有 BOOKS，支持多类型资料 |
| `user_recommendations` | 用户推荐候选池 | 待管理员审核 |
| `ratings` | 用户评分记录 | 每个匿名用户对每个资源评分一次 |
| `comments` | 资源评论区 | **前端暂不开放，仅 demo 展示** |
| `reading_notes` | 用户读书笔记 | **前端暂不开放，仅 demo 展示** |
| `resource_stats` | 资源统计缓存 | 定时任务更新，避免实时聚合 |
| `invite_codes` | 邀请码配置 | 存储统一邀请码 `1234` |

---

## 三、详细数据结构设计

### 3.1 领域表 (domains)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(50) | PRIMARY KEY | 领域唯一标识，如 `ai-engineering` |
| `name` | VARCHAR(100) | NOT NULL | 领域名称，如 "AI 工程" |
| `color` | VARCHAR(20) | NOT NULL | 领域颜色，如 `#3B82F6` |
| `sort_order` | SMALLINT | DEFAULT 0 | 排序权重 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

**初始数据（迁移现有 DOMAINS）：**

```typescript
[
  { id: "ai-engineering", name: "AI 工程", color: "#3B82F6", sort_order: 1 },
  { id: "ai-product-method", name: "AI 产品与方法", color: "#8B5CF6", sort_order: 2 },
  { id: "agent-systems", name: "Agent 与智能系统", color: "#EC4899", sort_order: 3 },
  { id: "org-change", name: "组织变革", color: "#F59E0B", sort_order: 4 },
  { id: "data-intelligence", name: "数据智能", color: "#10B981", sort_order: 5 },
  { id: "business-landing", name: "商业落地", color: "#06B6D4", sort_order: 6 },
  { id: "ethics-governance", name: "伦理治理", color: "#EF4444", sort_order: 7 },
  { id: "ai-fundamentals", name: "AI 基础与原理", color: "#6366F1", sort_order: 8 }
]
```

---

### 3.2 圈层表 (rings)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | VARCHAR(50) | PRIMARY KEY | 圈层标识：`beginner`, `intermediate`, `advanced` |
| `name` | VARCHAR(100) | NOT NULL | 显示名称 |
| `radius_range` | VARCHAR(20) | NOT NULL | 半径范围：`inner`, `middle`, `outer` |
| `sort_order` | SMALLINT | DEFAULT 0 | 排序权重 |

**初始数据：**

```typescript
[
  { id: "beginner", name: "入门", radius_range: "inner", sort_order: 1 },
  { id: "intermediate", name: "进阶", radius_range: "middle", sort_order: 2 },
  { id: "advanced", name: "高级", radius_range: "outer", sort_order: 3 }
]
```

---

### 3.3 资源表 (resources) ⭐核心表

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | 资源唯一标识 |
| **`title`** | VARCHAR(255) | NOT NULL | **资料名称** |
| **`resource_type`** | VARCHAR(20) | NOT NULL CHECK | **资料类型：`book`/`course`/`article`** |
| **`resource_url`** | TEXT | NULL | **资料链接（书籍可为空）** |
| **`domain_id`** | VARCHAR(50) | FK → domains.id | **能力主题/领域** |
| **`ring_id`** | VARCHAR(50) | FK → rings.id | **细分领域/学习阶段** |
| **`rating`** | SMALLINT | CHECK (1-5) | **推荐程度（管理员设定）** |
| **`reason`** | TEXT | NOT NULL | **推荐理由** |
| **`recommender`** | VARCHAR(100) | NULL | **推荐人姓名/昵称** |
| `author` | VARCHAR(255) | NULL | 作者（书籍必填） |
| `publisher` | VARCHAR(255) | NULL | 出版社 |
| `published_year` | INT | NULL | 出版年份 |
| `isbn` | VARCHAR(20) | UNIQUE | ISBN 编号 |
| `description` | TEXT | NULL | 详细描述 |
| `cover_image_url` | TEXT | NULL | 封面图链接 |
| `thumbnail` | JSONB | DEFAULT '{}' | 略缩图数据（标签、徽章等） |
| `status` | VARCHAR(20) | DEFAULT 'approved' | 状态：`approved`/`archived` |
| `view_count` | INT | DEFAULT 0 | 浏览次数 |
| `bookmark_count` | INT | DEFAULT 0 | 收藏次数 |
| `weighted_score` | DECIMAL(3,2) | DEFAULT 0.00 | 贝叶斯加权分 |
| `published_at` | TIMESTAMPTZ | DEFAULT NOW() | 审核通过时间 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

**索引设计：**
- `idx_resources_domain_ring` ON (domain_id, ring_id)
- `idx_resources_published_at` ON (published_at DESC)
- `idx_resources_weighted_score` ON (weighted_score DESC)
- `idx_resources_view_count` ON (view_count DESC)
- `idx_resources_type_status` ON (resource_type, status)

**thumbnail 字段结构示例：**

```json
{
  "badge": "新",
  "highlight": "🔥",
  "tags": ["畅销", "经典"]
}
```

---

### 3.4 用户推荐表 (user_recommendations)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | 推荐记录 ID |
| `title` | VARCHAR(255) | NOT NULL | 资料名称 |
| `resource_type` | VARCHAR(20) | NOT NULL | 资料类型 |
| `resource_url` | TEXT | NULL | 资料链接 |
| `domain_id` | VARCHAR(50) | FK → domains.id | 领域 |
| `ring_id` | VARCHAR(50) | FK → rings.id | 学习阶段 |
| `rating` | SMALLINT | CHECK (1-5) | 推荐程度 |
| `reason` | TEXT | NOT NULL | 推荐理由 |
| `recommender` | VARCHAR(100) | NULL | 推荐人 |
| `author` | VARCHAR(255) | NULL | 作者 |
| `isbn` | VARCHAR(20) | NULL | ISBN（用于去重） |
| `status` | VARCHAR(20) | DEFAULT 'pending' | 状态：`pending`/`approved`/`rejected` |
| `duplicate_resource_id` | UUID | FK → resources.id | **如果重复，关联到已存在资源** |
| `reviewed_by` | VARCHAR(100) | NULL | 审核管理员 |
| `reviewed_at` | TIMESTAMPTZ | NULL | 审核时间 |
| `review_note` | TEXT | NULL | 审核备注 |
| `approved_resource_id` | UUID | FK → resources.id | 审核通过后关联的正式资源 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 提交时间 |
| `ip_address` | VARCHAR(45) | NULL | 提交者 IP（防刷量） |

**索引设计：**
- `idx_recommendations_status` ON (status)
- `idx_recommendations_created` ON (created_at DESC)
- `idx_recommendations_isbn` ON (isbn) WHERE isbn IS NOT NULL

---

### 3.5 用户评分表 (ratings)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | 评分记录 ID |
| `resource_id` | UUID | FK → resources.id | 评分资源 |
| `rating` | SMALLINT | CHECK (1-5) | 评分值（1-5 星） |
| `review_text` | TEXT | NULL | 评分评论 |
| `session_id` | VARCHAR(100) | NOT NULL | **匿名会话标识（浏览器指纹或随机 ID）** |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 评分时间 |

**约束：**
- `UNIQUE (resource_id, session_id)` - 每个匿名用户对同一资源只能评分一次

**索引设计：**
- `idx_ratings_resource_time` ON (resource_id, created_at DESC)

---

### 3.6 资源统计缓存表 (resource_stats)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `resource_id` | UUID | PK, FK → resources.id | 资源 ID |
| `avg_rating` | DECIMAL(3,2) | DEFAULT 0.00 | 平均评分 |
| `rating_count` | INT | DEFAULT 0 | 评分人数 |
| `view_count_7d` | INT | DEFAULT 0 | 7 天浏览量 |
| `view_count_30d` | INT | DEFAULT 0 | 30 天浏览量 |
| `last_updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最后更新时间 |

---

### 3.7 评论表 (comments) - 暂不开放

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | 评论 ID |
| `resource_id` | UUID | FK → resources.id | 关联资源 |
| `parent_comment_id` | UUID | FK → comments.id | 父评论（支持楼中楼） |
| `content` | TEXT | NOT NULL | 评论内容 |
| `session_id` | VARCHAR(100) | NOT NULL | 匿名会话标识 |
| `status` | VARCHAR(20) | DEFAULT 'visible' | 状态：`visible`/`hidden` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 评论时间 |

---

### 3.8 读书笔记表 (reading_notes) - 暂不开放

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | 笔记 ID |
| `resource_id` | UUID | FK → resources.id | 关联资源 |
| `session_id` | VARCHAR(100) | NOT NULL | 匿名会话标识 |
| `chapter` | VARCHAR(100) | NULL | 章节/页码 |
| `content` | TEXT | NOT NULL | 笔记内容 |
| `is_public` | BOOLEAN | DEFAULT FALSE | 是否公开 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

---

### 3.9 邀请码配置表 (invite_codes)

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `code` | VARCHAR(20) | PRIMARY KEY | 邀请码（如 `1234`） |
| `is_active` | BOOLEAN | DEFAULT TRUE | 是否启用 |
| `usage_limit` | INT | NULL | 使用次数限制（NULL 表示无限制） |
| `used_count` | INT | DEFAULT 0 | 已使用次数 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

**初始数据：**

```typescript
{ code: "1234", is_active: true, usage_limit: null, used_count: 0 }
```

---

## 四、核心业务逻辑流程

### 4.1 用户推荐流程

```
1. 用户填写推荐表单
   ↓
2. 前端验证邀请码 === "1234"
   ↓
3. 查询 resources 和 user_recommendations 检查重复
   ├─ 重复：返回 { duplicate: true, existing_resource: {...} }
   └─ 不重复：继续
   ↓
4. 插入 user_recommendations (status='pending')
   ↓
5. 返回成功提示：已提交推荐，等待管理员审核
```

**重复检测逻辑（SQL）：**

```sql
-- 方案1: ISBN 匹配（书籍类）
SELECT id, title FROM resources
WHERE isbn = :isbn AND status = 'approved';

-- 方案2: 标题+作者匹配（无 ISBN 时）
SELECT id, title FROM resources
WHERE LOWER(title) = LOWER(:title)
  AND LOWER(author) = LOWER(:author)
  AND status = 'approved';

-- 方案3: URL 匹配（课程/文章类）
SELECT id, title FROM resources
WHERE resource_url = :url AND status = 'approved';
```

---

### 4.2 管理员审核流程

```
1. 管理员查看待审核列表
   GET /admin/recommendations?status=pending
   ↓
2. 管理员点击"审核通过"
   POST /admin/recommendations/:id/approve
   ↓
3. 后端逻辑：
   a. 创建 resources 记录（从推荐记录复制字段）
   b. 更新 user_recommendations.status = 'approved'
   c. 关联 approved_resource_id
   d. 触发定时任务计算 weighted_score
   ↓
4. 管理员点击"拒绝"
   POST /admin/recommendations/:id/reject
   ↓
5. 后端逻辑：
   a. 更新 user_recommendations.status = 'rejected'
   b. 记录 review_note
```

---

### 4.3 评分加权算法

**贝叶斯加权平均公式：**

```
weighted_score = (v / (v + m)) * R + (m / (v + m)) * C

参数说明：
- R = 该资源的平均评分
- v = 该资源的评分人数
- m = 全局平均评分人数（建议值：10）
- C = 全局平均评分（建议值：3.5）
```

**计算时机：**
- 定时任务每小时更新所有资源的 `weighted_score`
- 新评分提交后，标记该资源为"需要重新计算"

**SQL 函数实现：**

```sql
CREATE OR REPLACE FUNCTION calculate_weighted_score(resource_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INT;
  global_avg_rating DECIMAL(3,2);
  global_avg_count DECIMAL(10,2);
BEGIN
  -- 获取该资源的评分统计
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, rating_count
  FROM ratings
  WHERE resource_id = resource_uuid;

  -- 获取全局基准值
  SELECT AVG(avg_rating), AVG(rating_count)
  INTO global_avg_rating, global_avg_count
  FROM (
    SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
    FROM ratings
    GROUP BY resource_id
  ) stats;

  -- 如果没有评分,返回 0
  IF rating_count = 0 OR avg_rating IS NULL THEN
    RETURN 0.00;
  END IF;

  -- 贝叶斯加权计算
  RETURN (
    (rating_count / (rating_count + global_avg_count)) * avg_rating +
    (global_avg_count / (rating_count + global_avg_count)) * global_avg_rating
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 4.4 排行榜查询逻辑

#### 本周上新

```typescript
// Supabase PostgREST 查询
{
  table: "resources",
  select: "*",
  filters: [
    { column: "status", operator: "eq", value: "approved" },
    { column: "published_at", operator: "gte", value: "NOW() - INTERVAL '7 days'" }
  ],
  order: { column: "published_at", ascending: false },
  limit: 10
}
```

#### 本月最火

```typescript
// 需要关联 resource_stats 表
{
  table: "resources",
  select: "*, resource_stats(view_count_30d)",
  filters: [
    { column: "status", operator: "eq", value: "approved" }
  ],
  order: [
    { column: "resource_stats.view_count_30d", ascending: false },
    { column: "weighted_score", ascending: false }
  ],
  limit: 10
}
```

#### 观看最多

```typescript
{
  table: "resources",
  select: "*",
  filters: [
    { column: "status", operator: "eq", value: "approved" }
  ],
  order: { column: "view_count", ascending: false },
  limit: 10
}
```

#### Inspire Top 10

```typescript
{
  table: "resources",
  select: "*",
  filters: [
    { column: "status", operator: "eq", value: "approved" }
  ],
  order: { column: "weighted_score", ascending: false },
  limit: 10
}
```

---

### 4.5 搜索功能

**PostgreSQL 全文检索：**

```sql
-- 创建搜索索引
CREATE INDEX idx_resources_search ON resources
USING GIN (
  to_tsvector('simple', title) ||
  to_tsvector('simple', COALESCE(author, '')) ||
  to_tsvector('simple', reason)
);

-- 搜索查询
SELECT * FROM resources
WHERE to_tsvector('simple', title || ' ' || COALESCE(author, '') || ' ' || reason)
      @@ to_tsquery('simple', :search_term)
  AND status = 'approved'
ORDER BY ts_rank(
  to_tsvector('simple', title || ' ' || COALESCE(author, '') || ' ' || reason),
  to_tsquery('simple', :search_term)
) DESC;
```

---

## 五、数据库约束与索引

### 5.1 外键约束

```sql
-- resources 表外键
ALTER TABLE resources
  ADD CONSTRAINT fk_resources_domain
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_resources_ring
    FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE RESTRICT;

-- ratings 表外键
ALTER TABLE ratings
  ADD CONSTRAINT fk_ratings_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE;

-- user_recommendations 表外键
ALTER TABLE user_recommendations
  ADD CONSTRAINT fk_recommendations_domain
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_recommendations_ring
    FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_recommendations_approved_resource
    FOREIGN KEY (approved_resource_id) REFERENCES resources(id) ON DELETE SET NULL;
```

### 5.2 唯一性约束

```sql
-- 每个匿名用户对同一资源只能评分一次
ALTER TABLE ratings
  ADD CONSTRAINT uq_ratings_resource_session
    UNIQUE (resource_id, session_id);

-- ISBN 在正式资源中唯一
ALTER TABLE resources
  ADD CONSTRAINT uq_resources_isbn
    UNIQUE (isbn);
```

### 5.3 检查约束

```sql
-- 评分范围约束
ALTER TABLE ratings
  ADD CONSTRAINT chk_ratings_rating
    CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE resources
  ADD CONSTRAINT chk_resources_rating
    CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE user_recommendations
  ADD CONSTRAINT chk_recommendations_rating
    CHECK (rating >= 1 AND rating <= 5);

-- 资源类型约束
ALTER TABLE resources
  ADD CONSTRAINT chk_resources_type
    CHECK (resource_type IN ('book', 'course', 'article'));

ALTER TABLE user_recommendations
  ADD CONSTRAINT chk_recommendations_type
    CHECK (resource_type IN ('book', 'course', 'article'));

-- 状态约束
ALTER TABLE resources
  ADD CONSTRAINT chk_resources_status
    CHECK (status IN ('approved', 'archived'));

ALTER TABLE user_recommendations
  ADD CONSTRAINT chk_recommendations_status
    CHECK (status IN ('pending', 'approved', 'rejected'));
```

---

## 六、Row Level Security (RLS) 策略

```sql
-- resources 表：所有人可读已审核资源
CREATE POLICY "resources_read_approved" ON resources
FOR SELECT USING (status = 'approved');

-- user_recommendations 表：所有人可插入
CREATE POLICY "recommendations_insert" ON user_recommendations
FOR INSERT WITH CHECK (true);

-- ratings 表：所有人可插入和读取
CREATE POLICY "ratings_insert" ON ratings
FOR INSERT WITH CHECK (true);

CREATE POLICY "ratings_select" ON ratings
FOR SELECT USING (true);

-- domains 和 rings 表：所有人可读
CREATE POLICY "domains_select" ON domains
FOR SELECT USING (true);

CREATE POLICY "rings_select" ON rings
FOR SELECT USING (true);
```

---

## 七、API 接口设计

### 7.1 用户端接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/recommendations` | POST | 提交推荐（验证邀请码） |
| `/api/recommendations/check-duplicate` | POST | 检查重复推荐 |
| `/api/resources` | GET | 获取资源列表（支持筛选） |
| `/api/resources/new-this-week` | GET | 本周上新 |
| `/api/resources/hot-this-month` | GET | 本月最火 |
| `/api/resources/most-viewed` | GET | 观看最多 |
| `/api/resources/top-rated` | GET | Inspire Top 10 |
| `/api/resources/search` | GET | 搜索资源 |
| `/api/resources/:id/rate` | POST | 用户评分 |
| `/api/resources/:id/view` | POST | 记录浏览 |

### 7.2 管理端接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `/admin/recommendations` | GET | 待审核列表 |
| `/admin/recommendations/:id/approve` | POST | 审核通过 |
| `/admin/recommendations/:id/reject` | POST | 拒绝推荐 |
| `/admin/resources` | GET | 资源管理列表 |
| `/admin/resources/:id` | PATCH | 编辑资源 |
| `/admin/resources/:id/archive` | POST | 下架资源 |

---

## 八、前端对接改动

### 8.1 类型定义更新

```typescript
// src/lib/constants.ts

export type ResourceType = 'book' | 'course' | 'article';

export interface Resource {
  id: string;
  title: string;
  resource_type: ResourceType;
  resource_url?: string;
  domain_id: string;
  ring_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reason: string;
  recommender?: string;
  author?: string;
  publisher?: string;
  published_year?: number;
  isbn?: string;
  description?: string;
  cover_image_url?: string;
  thumbnail?: {
    badge?: string;
    highlight?: string;
    tags?: string[];
  };
  weighted_score: number;
  view_count: number;
  published_at: string;
}

// 删除原有 Book 类型
// export type Book = { ... } // 已删除
```

### 8.2 数据文件调整

```typescript
// 删除文件
DELETE: src/data/books.ts

// 更新导入
// 原有代码：
import { BOOKS } from '@/data/books';

// 改为从 API 获取：
import { getResources } from '@/lib/api/resources';
const resources = await getResources();
```

---

## 九、数据迁移计划

### 9.1 删除静态数据

- [x] 删除 `src/data/books.ts`
- [x] 更新 `src/lib/constants.ts` 类型定义
- [x] 更新所有组件的数据源

### 9.2 数据库初始化

1. 在 Supabase Dashboard 创建项目
2. 执行 Migration Script 创建所有表
3. 插入 `domains` 和 `rings` 初始数据
4. 插入 `invite_codes` 初始数据（`1234`）
5. 配置 RLS 策略
6. 创建全文检索索引

### 9.3 前端改造

1. 安装 `@supabase/supabase-js` 依赖
2. 创建 `src/lib/supabase.ts` 客户端配置
3. 创建 `src/lib/api/` 目录封装 API 调用
4. 更新雷达图组件使用动态数据
5. 实现推荐表单后端对接
6. 实现评分功能

---

## 十、性能优化建议

### 10.1 定时任务

- 每小时更新 `resources.weighted_score`
- 每天更新 `resource_stats` 统计缓存
- 每周清理过期 session 数据

### 10.2 缓存策略

- Top 10 榜单使用 Redis 缓存，5 分钟过期
- 雷达图点位数据缓存 10 分钟
- 搜索结果缓存 1 分钟

### 10.3 分页限制

- 所有列表接口默认返回 10 条，最多 100 条
- 搜索结果最多返回 50 条

---

## 十一、安全注意事项

1. **邀请码验证**：前端验证后，后端需二次验证防止绕过
2. **防刷机制**：同一 IP 每小时最多提交 5 次推荐
3. **评分限制**：同一 session 对同一资源只能评分一次
4. **SQL 注入防护**：使用 Supabase 提供的参数化查询
5. **XSS 防护**：用户输入的内容需做转义处理

---

## 十二、变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-07-20 | v1.0 | 初始版本，定义完整数据架构 |