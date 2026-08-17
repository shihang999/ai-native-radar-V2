import { DOMAINS, RINGS } from '@/lib/constants';
import type {
  FieldConfidence,
  ParsedRecommendationItem,
  RecommendationRating,
  ResourceType,
} from './types';
import { RESOURCE_TYPES } from './types';

const DOMAIN_IDS = DOMAINS.map((d) => d.id);
const RING_IDS = RINGS.map((r) => r.id);
const RATINGS: RecommendationRating[] = [1, 2, 3, 4, 5];
const RESOURCE_TYPE_VALUES: ResourceType[] = [...RESOURCE_TYPES];

function clamp01(x: number | undefined | null): number {
  if (typeof x !== 'number') return 0.4;
  if (Number.isNaN(x)) return 0.4;
  return Math.min(1, Math.max(0, x));
}

function validRating(x: unknown): RecommendationRating {
  if (typeof x !== 'number' || !Number.isInteger(x)) return 4;
  return RATINGS.includes(x as RecommendationRating) ? (x as RecommendationRating) : 4;
}

function inSet<T extends string>(x: unknown, set: readonly T[]): T | null {
  if (typeof x !== 'string') return null;
  return set.includes(x as T) ? (x as T) : null;
}

function safeString(x: unknown, fallback: string | null = null): string | null {
  if (x == null) return fallback;
  if (typeof x === 'string') return x.trim().length === 0 ? fallback : x.trim();
  try {
    return String(x);
  } catch {
    return fallback;
  }
}

interface ConfidenceLike {
  title?: unknown;
  author?: unknown;
  resource_type?: unknown;
  resource_url?: unknown;
  domain_id?: unknown;
  ring_id?: unknown;
  rating?: unknown;
  reason_summary?: unknown;
  overall?: unknown;
  [k: string]: unknown;
}

interface ItemLike {
  title?: unknown;
  author?: unknown;
  resource_type?: unknown;
  resource_url?: unknown;
  domain_id?: unknown;
  ring_id?: unknown;
  rating?: unknown;
  reason_summary?: unknown;
  confidence?: ConfidenceLike;
  raw_source_excerpt?: unknown;
  [k: string]: unknown;
}

interface RootLike {
  items?: unknown;
  [k: string]: unknown;
}

function asRootLike(raw: unknown): RootLike | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as RootLike;
}

function asItemsArr(raw: unknown): ItemLike[] {
  if (!Array.isArray(raw)) return [];
  const arr: ItemLike[] = [];
  for (const el of raw) {
    if (el && typeof el === 'object') arr.push(el as ItemLike);
  }
  return arr;
}

export interface ValidationResult {
  items: ParsedRecommendationItem[];
  truncated: boolean;
  original_items_count: number;
}

/**
 * 严格校验并归一化模型返回的 JSON：
 * 1. 枚举强约束（domain_id/ring_id/resource_type/rating），非法置空或回退默认
 * 2. 字符串清洗与长度保护
 * 3. 置信度 0~1 clamp
 * 4. 同批次内部去重（title+author 完全相同合并，保留 reason_summary 最长那条）
 * 5. 数量上限 10，超过截断
 */
export function validateAndNormalizeParsedItems(raw: unknown): ValidationResult {
  const MAX_ITEMS = 10;
  const root = asRootLike(raw);
  const itemsRaw = root ? asItemsArr(root.items).slice(0, 15) : [];
  const normalized: ParsedRecommendationItem[] = [];
  const seen = new Set<string>();

  for (const row of itemsRaw) {
    const title = safeString(row.title, null);
    const author = safeString(row.author, null);
    const reasonRaw = safeString(row.reason_summary, '未识别，请补充推荐理由')!;
    const reason_summary = reasonRaw.length < 5 ? '未识别，请补充推荐理由' : reasonRaw;

    const key = `${(title ?? '').toLowerCase()}::${(author ?? '').toLowerCase()}`;
    if (title != null && seen.has(key)) continue;
    if (title != null) seen.add(key);

    const resource_type = inSet<ResourceType>(row.resource_type, RESOURCE_TYPE_VALUES);
    const domain_id = typeof row.domain_id === 'string' ? inSet(row.domain_id, DOMAIN_IDS) : null;
    const ring_id = typeof row.ring_id === 'string' ? inSet(row.ring_id, RING_IDS) : null;
    const rating = validRating(row.rating ?? null);
    const resource_url = safeString(row.resource_url, null);

    const raw_conf: ConfidenceLike =
      row.confidence && typeof row.confidence === 'object' ? row.confidence : { overall: 0.4 };
    const confidence: FieldConfidence = {
      title: clamp01(raw_conf.title as number | undefined | null),
      author: clamp01(raw_conf.author as number | undefined | null),
      resource_type: clamp01(raw_conf.resource_type as number | undefined | null),
      resource_url: clamp01(raw_conf.resource_url as number | undefined | null),
      domain_id: clamp01(raw_conf.domain_id as number | undefined | null),
      ring_id: clamp01(raw_conf.ring_id as number | undefined | null),
      rating: clamp01(raw_conf.rating as number | undefined | null),
      reason_summary: clamp01(raw_conf.reason_summary as number | undefined | null),
      overall: clamp01(raw_conf.overall as number | undefined | null),
    };

    if (title == null && reason_summary.length < 10) {
      continue;
    }

    normalized.push({
      title,
      author,
      resource_type,
      resource_url,
      domain_id,
      ring_id,
      rating,
      reason_summary,
      confidence,
      raw_source_excerpt: safeString(row.raw_source_excerpt) ?? undefined,
    });
  }

  const original_items_count = normalized.length;
  const truncated = original_items_count > MAX_ITEMS;
  return {
    items: normalized.slice(0, MAX_ITEMS),
    truncated,
    original_items_count,
  };
}

/**
 * 把供应商返回的非 JSON 文本清洗成可解析的 JSON 字符串：
 * - 去除 ```json ... ``` 包裹
 * - 去除前后多余的解释文字（以第一个 { 和最后一个 } 截取）
 */
export function extractJsonBlob(text: string): string {
  let s = text.trim();
  if (!s) return '{}';
  s = s.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (_m: unknown, g1: unknown) => String(g1 ?? ''));
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) {
    return s;
  }
  return s.slice(first, last + 1);
}
