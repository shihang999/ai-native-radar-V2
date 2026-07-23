import { supabase } from '../supabase';
import type { Database, Resource, UserRecommendation } from '../database.types';

type UserRecommendationInsert = Database['public']['Tables']['user_recommendations']['Insert'];
type RatingInsert = Database['public']['Tables']['ratings']['Insert'];

// 获取所有已审核资源
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

// 本周上新
export async function getNewThisWeek(): Promise<Resource[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .gte('published_at', sevenDaysAgo)
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('获取本周上新失败:', error);
    return [];
  }

  return data || [];
}

// 本月最火（基于 view_count_30d）
export async function getHotThisMonth(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      resource_stats!inner(view_count_30d)
    `)
    .eq('status', 'approved')
    .order('view_count', { ascending: false })
    .limit(10);

  if (error) {
    console.error('获取本月最火失败:', error);
    return [];
  }

  return data || [];
}

// 观看最多
export async function getMostViewed(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .order('view_count', { ascending: false })
    .limit(10);

  if (error) {
    console.error('获取观看最多失败:', error);
    return [];
  }

  return data || [];
}

// Inspire Top 10
export async function getTopRated(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .order('weighted_score', { ascending: false })
    .limit(10);

  if (error) {
    console.error('获取 Top 10 失败:', error);
    return [];
  }

  return data || [];
}

// 搜索资源
export async function searchResources(query: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .rpc('search_resources', { search_term: query });

  if (error) {
    console.error('搜索失败:', error);
    return [];
  }

  return data || [];
}

// 提交推荐
export async function submitRecommendation(
  recommendation: Omit<UserRecommendation, 'id' | 'status' | 'created_at'>
): Promise<{ success: boolean; duplicate?: Resource; error?: string }> {
  const { data: duplicateCheck } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .or(`title.eq.${recommendation.title},isbn.eq.${recommendation.isbn}`)
    .limit(1);

  if (duplicateCheck && duplicateCheck.length > 0) {
    return {
      success: false,
      duplicate: duplicateCheck[0],
      error: '该资源已存在'
    };
  }

  const payload: UserRecommendationInsert = {
    ...recommendation,
    status: 'pending'
  };

  const { error } = await supabase
    .from('user_recommendations')
    .insert([payload]);

  if (error) {
    return {
      success: false,
      error: error.message
    };
  }

  return { success: true };
}

// 提交评分
export async function submitRating(
  resourceId: string,
  rating: number,
  sessionId: string,
  reviewText?: string
): Promise<{ success: boolean; error?: string }> {
  const payload: RatingInsert = {
    resource_id: resourceId,
    rating,
    session_id: sessionId,
    review_text: reviewText
  };

  const { error } = await supabase
    .from('ratings')
    .insert([payload]);

  if (error) {
    return {
      success: false,
      error: error.message
    };
  }

  return { success: true };
}

// 记录浏览
export async function recordView(resourceId: string): Promise<void> {
  await supabase.rpc('increment_view_count', { resource_id: resourceId });
}

// 筛选资源（支持领域、圈层、类型筛选）
export interface ResourceFilters {
  domainId?: string;
  ringId?: string;
  resourceType?: 'book' | 'course' | 'article';
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

  const { data, error } = await query;

  if (error) {
    console.error('筛选资源失败:', error);
    return [];
  }

  return data || [];
}

// 获取单个资源详情
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

// 获取相关资源（同领域同圈层）
export async function getRelatedResources(
  resourceId: string,
  domainId: string,
  ringId: string,
  limit: number = 4
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

// 获取资源的平均评分和评分数
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

// 检查用户是否已评分
export async function hasUserRated(
  resourceId: string,
  sessionId: string
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
