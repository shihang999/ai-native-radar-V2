import { NextRequest, NextResponse } from 'next/server';
import { submitBatchRecommendations } from '@/lib/api/resources';
import type { BatchRecommendationItem, SubmitBatchResult } from '@/lib/api/resources';
import type { InputMode, RecommendationRating, Source } from '@/lib/ai/types';
import {
  isDomainId,
  isRingId,
  isResourceType,
  sanitizeFreeText,
  sanitizeRecommenderName,
  validateInputMode,
} from '@/lib/ai/utils';
import { DOMAINS, RINGS } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  items?: Array<Record<string, unknown>>;
  input_mode?: unknown;
  source?: unknown;
  recommender_name?: unknown;
  batch_id?: string;
  raw_text_snapshot?: unknown;
  ocr_text_snapshot?: unknown;
  audio_metadata?: unknown;
}

function coerceRating(x: unknown): RecommendationRating {
  if (Number.isInteger(x) && typeof x === 'number' && x >= 1 && x <= 5) return x as RecommendationRating;
  return 4;
}

function normalizeItem(raw: Record<string, unknown>, idx: number): BatchRecommendationItem & { __valid: boolean; __error?: string } {
  const title = sanitizeFreeText(raw.title, 120);
  if (!title) return { title: '', reason: '', resource_type: 'book', domain_id: DOMAINS[0].id, ring_id: RINGS[0].id, __valid: false, __error: `第 ${idx + 1} 条缺少标题` };
  const resource_type = isResourceType(raw.resource_type) ? raw.resource_type : 'book';
  const domain_id = isDomainId(raw.domain_id) ? raw.domain_id : DOMAINS[0].id;
  const ring_id = isRingId(raw.ring_id) ? raw.ring_id : RINGS[0].id;
  const rating = coerceRating(raw.rating);
  const author = sanitizeFreeText(raw.author, 60);
  const resource_url = raw.resource_url && typeof raw.resource_url === 'string' && isHttpUrl(raw.resource_url) ? raw.resource_url : null;
  const reason = sanitizeFreeText(raw.reason, 2000) ?? '未提供推荐理由';
  const ai_confidence = raw.ai_confidence && typeof raw.ai_confidence === 'object'
    ? (raw.ai_confidence as BatchRecommendationItem['ai_confidence'])
    : null;
  return {
    title,
    author,
    resource_type,
    resource_url,
    domain_id,
    ring_id,
    rating,
    reason,
    ai_confidence,
    __valid: true,
  } as BatchRecommendationItem & { __valid: boolean; __error?: string };
}

function isHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<SubmitBatchResult & { error?: string }>> {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch (e) {
    return NextResponse.json({
      success: false,
      success_count: 0,
      fail_items: [],
      error: '提交数据格式错误，请刷新后重试',
    });
  }

  const input_mode: InputMode = validateInputMode(body.input_mode);
  const source: Source = body.source === 'manual' ? 'manual' : 'ai_parsed';
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (rawItems.length === 0) {
    return NextResponse.json({
      success: false,
      success_count: 0,
      fail_items: [],
      error: '请至少提交一条推荐内容',
    });
  }
  if (rawItems.length > 10) {
    return NextResponse.json({
      success: false,
      success_count: 0,
      fail_items: rawItems.map((_, index) => ({ index, error: '一次最多提交 10 条', item: {} as BatchRecommendationItem })),
    });
  }

  const normalized: BatchRecommendationItem[] = [];
  const failItems: SubmitBatchResult['fail_items'] = [];
  rawItems.forEach((raw, index) => {
    const item = normalizeItem(raw && typeof raw === 'object' ? raw : {}, index);
    if (!item.__valid) {
      failItems.push({
        index,
        error: item.__error ?? '字段校验失败',
        item: {
          title: item.title,
          resource_type: 'book',
          domain_id: DOMAINS[0].id,
          ring_id: RINGS[0].id,
          reason: item.reason,
        },
      });
      return;
    }
    const { __valid: _v, __error: _e, ...rest } = item as BatchRecommendationItem & { __valid?: boolean; __error?: string };
    void _v;
    void _e;
    normalized.push(rest);
  });

  if (normalized.length === 0) {
    return NextResponse.json({
      success: false,
      success_count: 0,
      fail_items: failItems,
      error: '没有可提交的有效条目',
    });
  }

  const recommender_name = sanitizeRecommenderName(body.recommender_name ?? null);
  const raw_text_snapshot = sanitizeFreeText(body.raw_text_snapshot, 8000);
  const ocr_text_snapshot = sanitizeFreeText(body.ocr_text_snapshot, 8000);

  const res = await submitBatchRecommendations({
    items: normalized,
    input_mode,
    source,
    recommender_name,
    batch_id: body.batch_id,
    raw_text_snapshot,
    ocr_text_snapshot,
    audio_metadata: body.audio_metadata ?? null,
  });

  if (failItems.length > 0) {
    return NextResponse.json({
      ...res,
      success: res.success && failItems.length === 0,
      fail_items: [...(res.fail_items ?? []), ...failItems],
      error: res.error ?? (failItems.length > 0 ? '部分条目校验失败' : undefined),
    });
  }
  return NextResponse.json(res);
}
