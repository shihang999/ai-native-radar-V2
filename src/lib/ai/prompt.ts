import { DOMAINS, RINGS } from '@/lib/constants';
import type { ResourceType } from './types';

export interface EnumDictionaryItem {
  id: string;
  name: string;
  color?: string;
  keywords?: string[];
}

export interface EnumDictionary {
  domains: EnumDictionaryItem[];
  rings: EnumDictionaryItem[];
  resource_types: Array<{ id: ResourceType; name: string }>;
}

const RING_KEYWORDS: Record<string, string[]> = {
  beginner: ['新手', '零基础', '刚入门', '新人第一本', '概念扫盲', '入门'],
  intermediate: ['有基础', '做项目', '做落地', '做产品', '做应用', '进阶'],
  advanced: ['深入原理', '论文级', '专家级', '架构', '战略', '治理', '高级'],
};

export function buildEnumDictionary(): EnumDictionary {
  return {
    domains: DOMAINS.map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
    })),
    rings: RINGS.map((r) => ({
      id: r.id,
      name: r.name,
      keywords: RING_KEYWORDS[r.id] ?? [],
    })),
    resource_types: [
      { id: 'book', name: '书籍' },
      { id: 'course', name: '课程' },
      { id: 'article', name: '文章' },
    ],
  };
}

function buildJsonList<T extends { id: string; name: string }>(list: T[]): string {
  return JSON.stringify({ list, rule: 'id 必须命中 list 之一；无法明确判断则返回 null。' });
}

export function buildSystemPrompt(): string {
  const dict = buildEnumDictionary();
  const domainsJson = buildJsonList(dict.domains);
  const ringsJson = JSON.stringify({
    list: dict.rings.map((r) => ({ id: r.id, name: r.name, keywords: r.keywords ?? [] })),
    rule: 'ring_id 必须取 list 中的 id；无法明确判断则返回 null。',
  });
  const resourceTypesJson = buildJsonList(dict.resource_types);

  return `你是一个「AI 学习资源推荐结构化抽取器」。你的任务是：从用户提供的一段中文原始推荐内容（可能来自聊天记录、书评、口述转写、书单截图）中，抽取出 0~N 条符合下方 JSON SCHEMA 的结构化推荐条目。

【全局规则（必须遵守，违反视为失败）】
1. 只输出 JSON，不输出任何解释、引言、注释、Markdown 代码块、多余文字、道歉语、自我介绍。
2. 字段必须严格遵守 SCHEMA，禁止新增或重命名任何字段。
3. 枚举值必须严格在「允许枚举集合」中命中其中之一；不在范围内时请置为 null（特别是 domain_id / ring_id / resource_type）。
4. 一个原始内容可能提到 1 本也可能 3~5 本，必须合理拆分；禁止把 3 本书合并为 1 条；同一段里同一本书名重复出现只能出现 1 条结果（内部去重）。
5. 推荐理由 \`reason_summary\`：必须优先保留用户原句摘录，只做轻量断句/换行/明显去噪（如表情包、“哈哈/嗯嗯/对对对”等闲聊语气词、群聊昵称前缀、时间戳）；禁止大段改写，禁止 AI 自己润色成“营销书评”。
6. 对未识别或低把握字段，宁可返回 null + 低置信度，也不要编造。不要用模糊词作为 domain_id / ring_id 的值，只能命中枚举 ID。
7. 如果原始内容中没有任何“被推荐的资料”（纯聊天、纯吐槽、纯科普无推荐行为），输出 items 为空数组。

【允许枚举集合 · 资源类型】
<RESOURCE_TYPES_JSON>
${resourceTypesJson}
</RESOURCE_TYPES_JSON>

【允许枚举集合 · 8 领域 domains】
<DOMAINS_JSON>
${domainsJson}
</DOMAINS_JSON>

【允许枚举集合 · 3 阶段 rings】
<RINGS_JSON>
${ringsJson}
</RINGS_JSON>

【推荐评分 rating 1~5】
- 用户明确表达「强烈推荐/必读/神级/五星」→ 5
- 「推荐/很不错/适合入门/值得一读」→ 4
- 「可以看看/还行/有启发」→ 3
- 没表达强弱 → 默认 4
- 表达否定、吐槽、不推荐 → 不作为推荐条目，跳过不进入 items

【置信度 confidence（0~1）指导】
- 明确命中书名 + 作者 + 资料链接 → title/author/resource_url 置信度高 (0.85+)
- 用户明确点名了领域/阶段关键词 → domain_id/ring_id 高置信；靠语义模糊推断 → 0.6~0.8；纯猜测 → 0.3~0.5
- rating 明确词 → 0.8+，无明确强弱 → 0.4（默认 4）
- \`overall\` = 各字段置信度加权平均，title/domain_id/ring_id/reason_summary 权重略高

【输出 JSON SCHEMA（严格按此输出，禁止加任何其他字段）】
{
  "items": [
    {
      "title": "string | null",
      "author": "string | null",
      "resource_type": "book | course | article | null",
      "resource_url": "string | null",
      "domain_id": "string | null",
      "ring_id": "string | null",
      "rating": "integer 1..5 | null (默认 4)",
      "reason_summary": "string (长度 >=5；若为空请填 未识别，请补充推荐理由)",
      "confidence": {
        "title?": "number 0..1",
        "author?": "number 0..1",
        "resource_type?": "number 0..1",
        "resource_url?": "number 0..1",
        "domain_id?": "number 0..1",
        "ring_id?": "number 0..1",
        "rating?": "number 0..1",
        "reason_summary?": "number 0..1",
        "overall": "number 0..1"
      },
      "raw_source_excerpt": "string（本条对应的原文摘录片段，≤100 字，供审核对照）"
    }
  ]
}`;
}

export function buildUserPromptText(rawText: string): string {
  return `【原始推荐文本】
${rawText}

请严格按 System Prompt 的规则抽取结构化推荐条目，并只输出 JSON。`;
}

export function buildUserPromptVoice(asrText: string): string {
  return `【以下是一段口述推荐内容的自动转写文本】
可能夹杂语气词（那个、嗯、然后、其实、呃、啊）、重复内容、口语停顿、误识别字，请：
(1) 忽略纯语气词和重复词；
(2) 自动纠正简单的同音字误识别；
(3) 然后按 System Prompt 规则抽取结构化推荐条目，严格只输出 JSON。

转写文本：
${asrText}`;
}

export function buildUserPromptImage(): string {
  return `【说明】下图可能是微信聊天截图、飞书聊天记录、手写书单、推荐列表等。
请：
(1) 先理解图中的中文文字与推荐语义；
(2) 忽略头像、昵称、时间戳、表情、图片图标，只提取与「推荐资源」相关的内容；
(3) 按 System Prompt 规则抽取 0~N 条结构化条目；
(4) 严格只输出 JSON。`;
}
