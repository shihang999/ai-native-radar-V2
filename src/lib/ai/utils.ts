import { buildEnumDictionary } from '@/lib/ai/prompt';
import type { InputMode, ResourceType } from './types';

export interface UserFacingError {
  code: string;
  message: string;
  user_message: string;
}

export function buildUserError(code: string, raw: unknown, user_message: string): UserFacingError {
  const message = raw instanceof Error ? `${raw.name}: ${raw.message}` : String(raw ?? 'unknown');
  return { code, message, user_message };
}

const dict = buildEnumDictionary();
const DOMAIN_IDS = new Set(dict.domains.map((d) => d.id));
const RING_IDS = new Set(dict.rings.map((r) => r.id));
const RESOURCE_TYPES: ReadonlySet<ResourceType> = new Set(['book', 'course', 'article']);

export function validateInputMode(mode: unknown): InputMode {
  if (mode === 'text' || mode === 'image' || mode === 'voice' || mode === 'manual') return mode;
  return 'text';
}

export function isDomainId(id: unknown): boolean {
  return typeof id === 'string' && DOMAIN_IDS.has(id);
}

export function isRingId(id: unknown): boolean {
  return typeof id === 'string' && RING_IDS.has(id);
}

export function isResourceType(x: unknown): x is ResourceType {
  return typeof x === 'string' && (RESOURCE_TYPES as Set<string>).has(x);
}

export function sanitizeRecommenderName(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  // XSS 基础防护：尖括号转义（展示层 React 默认 escape，这里做双保险）
  return s.replace(/[<>]/g, (c) => (c === '<' ? '＜' : '＞')).slice(0, 50);
}

export function sanitizeFreeText(raw: unknown, max: number, fallback: string | null = null): string | null {
  if (raw == null) return fallback;
  let s = String(raw);
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  s = s.replace(/\0/g, '').trim();
  if (s.length === 0) return fallback;
  if (s.length > max) s = s.slice(0, max);
  return s;
}

export function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
