import { supabase } from '../supabase';
import type { Database, Resource, UserRecommendation } from '../database.types';
import type { InputMode, ParsedRecommendationItem, RecommendationRating, Source } from '../ai/types';
import {
  isDomainId,
  isRingId,
  isResourceType,
  sanitizeFreeText,
  sanitizeRecommenderName,
  isValidUrl,
} from '../ai/utils';
import { DOMAINS, RINGS } from '../constants';

type UserRecommendationInsert = Database['public']['Tables']['user_recommendations']['Insert'];
type RatingInsert = Database['public']['Tables']['ratings']['Insert'];

export interface BatchRecommendationItem {
  title: string;
  author?: string | null;
  resource_type: 'book' | 'course' | 'article';
  resource_url?: string | null;
  domain_id: string;
  ring_id: string;
  rating?: RecommendationRating | null;
  reason: string;
  ai_confidence?: ParsedRecommendationItem['confidence'] | null;
  raw_source_excerpt?: string | null;
  linked_resource_id?: string | null;
}

export interface SubmitBatchInput {
  items: BatchRecommendationItem[];
  input_mode: InputMode;
  source: Source;
  recommender_name?: string | null;
  batch_id?: string;
  raw_text_snapshot?: string | null;
  ocr_text_snapshot?: string | null;
  audio_metadata?: unknown | null;
}

export interface SubmitBatchResult {
  success: boolean;
  success_count: number;
  fail_items: Array<{ index: number; error: string; item: BatchRecommendationItem }>;
  batch_id?: string;
  error?: string;
}

// ================================================================
// 读取查询（完全保留原行为，无修改）
// ================================================================

export async function getResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('获取资源失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 本周上新：列出当前进入雷达的书（雷达口径 = 已审核 + 推荐指数 4 星及以上），按上架时间倒序取最新
 * 统一口径：status='approved' + limit 10 + 主排序(published_at desc) + 稳定次级排序(weighted_score desc, id)
 * 说明：按“列出几本目前雷达中的书”的口径实现，确保与首页雷达一致、不会因严格 7 天窗口而为空
 */
export async function getNewThisWeek(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .gte('rating', 4)
    .order('published_at', { ascending: false })
    .order('weighted_score', { ascending: false })
    .order('id', { ascending: true })
    .limit(10);

  if (error) {
    console.error('获取本周上新失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 本周热门：按“同一本书的推荐次数”排序（最近 7 天内被推荐的次数）
 * 计算逻辑：统计最近 7 天 user_recommendations 中各标题出现次数，映射到已审核资源
 * 统一口径：status='approved' + limit 10 + 主排序(推荐次数 desc) + 稳定次级排序(weighted_score desc, published_at desc, id)
 * 说明：若最近 7 天无推荐（次数均为 0），则退化为按 weighted_score 排序，保证稳定不乱序
 */
export async function getTrendingThisWeek(): Promise<Resource[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recResult, resResult] = await Promise.all([
    supabase
      .from('user_recommendations')
      .select('title')
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('resources')
      .select('*')
      .eq('status', 'approved'),
  ]);

  if (resResult.error) {
    console.error('获取本周热门失败:', resResult.error);
    return [];
  }
  if (recResult.error) {
    console.error('统计本周推荐次数失败:', recResult.error);
  }

  // 按标题聚合最近 7 天的推荐次数
  const countByTitle = new Map<string, number>();
  for (const rec of recResult.data ?? []) {
    const key = rec.title?.trim();
    if (!key) continue;
    countByTitle.set(key, (countByTitle.get(key) ?? 0) + 1);
  }

  const resources = resResult.data ?? [];
  return [...resources]
    .map((resource) => ({
      resource,
      recCount: countByTitle.get(resource.title.trim()) ?? 0,
    }))
    .sort((a, b) => {
      if (b.recCount !== a.recCount) return b.recCount - a.recCount;
      if (b.resource.weighted_score !== a.resource.weighted_score) {
        return b.resource.weighted_score - a.resource.weighted_score;
      }
      const publishedDiff =
        new Date(b.resource.published_at).getTime() - new Date(a.resource.published_at).getTime();
      if (publishedDiff !== 0) return publishedDiff;
      return a.resource.id.localeCompare(b.resource.id);
    })
    .slice(0, 10)
    .map((item) => item.resource);
}

/**
 * Inspire Top 10（总榜）：按总评分（贝叶斯加权分 weighted_score）排序，每月更新
 * 统一口径：status='approved' + limit 10 + 主排序(weighted_score) + 稳定次级排序(published_at)
 */
export async function getTopRated(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .order('weighted_score', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('获取 Top 10 失败:', error);
    return [];
  }

  return data || [];
}

export async function searchResources(query: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .rpc('search_resources', { search_term: query });

  if (error) {
    console.error('搜索失败:', error);
    return [];
  }

  return data || [];
}

// ================================================================
// 提交（重点改造：
// 1. submitRecommendation 去掉查重拒提 + 去掉邀请码
// 2. 新增 submitBatchRecommendations 批量提交）
// ================================================================

function buildInsertPayload(
  it: BatchRecommendationItem,
  extra: {
    input_mode: InputMode;
    source: Source;
    batch_id?: string;
    recommender_name?: string | null;
    raw_text_snapshot?: string | null;
    ocr_text_snapshot?: string | null;
    audio_metadata?: unknown | null;
  },
): UserRecommendationInsert {
  const resource_type = isResourceType(it.resource_type) ? it.resource_type : 'book';
  const domain_id = isDomainId(it.domain_id) ? it.domain_id : (DOMAINS[0]?.id ?? 'ai-fundamentals');
  const ring_id = isRingId(it.ring_id) ? it.ring_id : (RINGS[0]?.id ?? 'beginner');
  const rating = Number.isInteger(it.rating) && (it.rating as number) >= 1 && (it.rating as number) <= 5
    ? (it.rating as number)
    : 4;
  const title = sanitizeFreeText(it.title, 120) ?? '未命名';
  const author = sanitizeFreeText(it.author, 60);
  const resource_url_valid = it.resource_url && isValidUrl(it.resource_url) ? it.resource_url : null;
  const reason = sanitizeFreeText(it.reason, 2000) ?? '未提供推荐理由';
  const recommender = sanitizeRecommenderName(extra.recommender_name);
  const confidence = it.ai_confidence ?? null;
  const raw_text_snapshot = sanitizeFreeText(extra.raw_text_snapshot, 8000);
  const ocr_text_snapshot = sanitizeFreeText(extra.ocr_text_snapshot, 8000);
  const audio_metadata_json = extra.audio_metadata && typeof extra.audio_metadata === 'object'
    ? (extra.audio_metadata as UserRecommendationInsert['audio_metadata'])
    : null;

  return {
    title,
    author,
    resource_type,
    resource_url: resource_url_valid,
    domain_id,
    ring_id,
    rating,
    reason,
    recommender,
    recommender_name_submitted: recommender,
    status: 'pending',
    input_mode: extra.input_mode,
    source: extra.source,
    batch_id: extra.batch_id ?? null,
    raw_text_snapshot,
    ocr_text_snapshot,
    audio_metadata: audio_metadata_json,
    ai_field_confidence: confidence as UserRecommendationInsert['ai_field_confidence'],
    linked_resource_id: it.linked_resource_id ?? null,
  };
}

/**
 * 批量提交推荐（同一请求内一次性 insert）
 */
export async function submitBatchRecommendations(input: SubmitBatchInput): Promise<SubmitBatchResult> {
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    return {
      success: false,
      success_count: 0,
      fail_items: [],
      error: '提交列表为空',
    };
  }
  if (items.length > 10) {
    return {
      success: false,
      success_count: 0,
      fail_items: items.map((item, index) => ({ index, error: '一次最多提交 10 条', item })),
    };
  }

  const batch_id = input.batch_id ?? randomUUID();
  const normalized = items.map((it) => buildInsertPayload(it, {
    input_mode: input.input_mode,
    source: input.source,
    batch_id,
    recommender_name: input.recommender_name ?? null,
    raw_text_snapshot: input.raw_text_snapshot ?? null,
    ocr_text_snapshot: input.ocr_text_snapshot ?? null,
    audio_metadata: input.audio_metadata ?? null,
  }));

  try {
    const { error } = await supabase.from('user_recommendations').insert(normalized);
    if (error) throw error;
    return { success: true, success_count: normalized.length, fail_items: [], batch_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      success_count: 0,
      fail_items: items.map((item, index) => ({ index, error: message, item })),
      batch_id,
    };
  }
}

/**
 * 单条提交（旧 RecommendDrawer 手工路径继续使用）
 * 关键改造：
 * - 查重仅作为提示返回，不再拦截提交
 * - 删除 invite_code 校验（recommendation 里传了也会被忽略）
 */
export async function submitRecommendation(
  recommendation: Omit<UserRecommendation, 'id' | 'status' | 'created_at'> & { invite_code?: unknown },
): Promise<{ success: boolean; duplicate?: Resource; error?: string; batch_id?: string }> {
  let duplicate: Resource | undefined;
  try {
    const titleForCheck = sanitizeFreeText(recommendation.title, 120);
    const { data: duplicateCheck } = await supabase
      .from('resources')
      .select('*')
      .eq('status', 'approved')
      .or(`title.eq.${titleForCheck ?? ''}`)
      .limit(1);
    if (duplicateCheck && duplicateCheck.length > 0) {
      duplicate = duplicateCheck[0];
    }
  } catch {
    /* 查重失败不阻断提交 */
  }

  const item: BatchRecommendationItem = {
    title: recommendation.title,
    author: recommendation.author ?? null,
    resource_type: isResourceType(recommendation.resource_type) ? recommendation.resource_type : 'book',
    resource_url: recommendation.resource_url ?? null,
    domain_id: recommendation.domain_id,
    ring_id: recommendation.ring_id,
    rating: Number.isInteger(recommendation.rating) && recommendation.rating !== null
      ? (recommendation.rating as RecommendationRating)
      : 4,
    reason: recommendation.reason,
  };
  const res = await submitBatchRecommendations({
    items: [item],
    input_mode: 'manual',
    source: 'manual',
    recommender_name: recommendation.recommender ?? null,
  });
  return {
    success: res.success,
    error: res.fail_items[0]?.error ?? res.error,
    batch_id: res.batch_id,
    duplicate,
  };
}

export async function submitRating(
  resourceId: string,
  rating: number,
  sessionId: string,
  reviewText?: string,
): Promise<{ success: boolean; error?: string }> {
  const payload: RatingInsert = {
    resource_id: resourceId,
    rating,
    session_id: sessionId,
    review_text: reviewText,
  };

  const { error } = await supabase
    .from('ratings')
    .insert([payload]);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function recordView(resourceId: string): Promise<void> {
  await supabase.rpc('increment_view_count', { resource_id: resourceId });
}

export interface ResourceFilters {
  domainId?: string;
  ringId?: string;
  resourceType?: 'book' | 'course' | 'article';
  searchTerm?: string;
}

export async function getResourcesWithFilters(filters: ResourceFilters): Promise<Resource[]> {
  let query = supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .order('published_at', { ascending: false });

  if (filters.domainId) {
    query = query.eq('domain_id', filters.domainId);
  }

  if (filters.ringId) {
    query = query.eq('ring_id', filters.ringId);
  }

  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }

  if (filters.searchTerm) {
    // 转义 PostgREST or() 语法中的特殊字符，避免查询解析错误
    const term = filters.searchTerm
      .trim()
      .replace(/[%,()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,author.ilike.%${term}%,reason.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('筛选资源失败:', error);
    return [];
  }

  return data || [];
}

export async function getResourceById(id: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error) {
    console.error('获取资源详情失败:', error);
    return null;
  }

  return data;
}

export async function getRelatedResources(
  resourceId: string,
  domainId: string,
  ringId: string,
  limit: number = 4,
): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .eq('domain_id', domainId)
    .eq('ring_id', ringId)
    .neq('id', resourceId)
    .order('weighted_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取相关资源失败:', error);
    return [];
  }

  return data || [];
}

export async function getResourceStats(resourceId: string): Promise<{
  avgRating: number;
  ratingCount: number;
}> {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('resource_id', resourceId);

  if (error || !data || data.length === 0) {
    return { avgRating: 0, ratingCount: 0 };
  }

  const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { avgRating, ratingCount: data.length };
}

export async function hasUserRated(
  resourceId: string,
  sessionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ratings')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('session_id', sessionId)
    .limit(1);

  if (error) {
    console.error('检查评分状态失败:', error);
    return false;
  }

  return (data && data.length > 0) || false;
}

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return s.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
