import {
  DASHSCOPE_API_KEY,
  DASHSCOPE_DEPLOYMENT_ID_TEXT,
  DASHSCOPE_DEPLOYMENT_ID_VL,
  DASHSCOPE_ENDPOINT,
  DASHSCOPE_LLM_MODEL,
  DASHSCOPE_VL_ENDPOINT,
  DASHSCOPE_VL_MODEL,
} from '@/lib/ai/env';
import { buildSystemPrompt, buildUserPromptImage, buildUserPromptText, buildUserPromptVoice } from '@/lib/ai/prompt';
import { extractJsonBlob, validateAndNormalizeParsedItems } from '@/lib/ai/schema';
import {
  buildUserError,
  isDomainId,
  isRingId,
  isResourceType,
  type UserFacingError,
} from '@/lib/ai/utils';
import type {
  InputMode,
  ParsedRecommendationItem,
  RecommendationRating,
} from './types';

const MAX_TOKENS = 4000;
const TEMPERATURE = 0.1;
const TOP_P = 0.7;
const MAX_RETRIES = 1;

type CompatibleChatMessage = {
  role: 'system' | 'user';
  content: string | CompatibleContentPart[];
};

type CompatibleContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface DashScopeCallResult<T = unknown> {
  status: 'ok' | 'invalid_json' | 'rate_limited' | 'error';
  items?: ParsedRecommendationItem[];
  rawText?: string;
  error?: UserFacingError;
  retryAfterMs?: number;
  truncated?: boolean;
  originalItemsCount?: number;
}

function normalizeUrlWithPath(base: string, suffix: string): string {
  if (!base) return base;
  if (!(base.startsWith('http://') || base.startsWith('https://'))) return base;
  try {
    const url = new URL(base);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname) return `${url.origin}${suffix}`;
    if (pathname.endsWith('/chat/completions') || pathname.endsWith('/generation')) return base;
    if (pathname.endsWith('/compatible-mode/v1')) return `${url.origin}${pathname}/chat/completions`;
    if (pathname.endsWith('/api/v1')) return `${url.origin}${suffix}`;
    return base;
  } catch {
    return base;
  }
}

function getCompatibleEndpoint(isImage: boolean): string {
  const base = isImage ? DASHSCOPE_VL_ENDPOINT : DASHSCOPE_ENDPOINT;
  return normalizeUrlWithPath(base, '/compatible-mode/v1/chat/completions');
}

function dashscopeHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function getModel(isImage: boolean): string {
  const deploymentId = isImage ? DASHSCOPE_DEPLOYMENT_ID_VL : DASHSCOPE_DEPLOYMENT_ID_TEXT;
  return deploymentId || (isImage ? DASHSCOPE_VL_MODEL : DASHSCOPE_LLM_MODEL);
}

async function callCompatibleChat(
  messages: CompatibleChatMessage[],
  inputMode: InputMode,
  isImage = false,
): Promise<DashScopeCallResult> {
  let retries = 0;
  let lastErr: unknown;

  do {
    try {
      const res = await fetch(getCompatibleEndpoint(isImage), {
        method: 'POST',
        headers: dashscopeHeaders(),
        body: JSON.stringify({
          model: getModel(isImage),
          messages,
          temperature: TEMPERATURE,
          top_p: TOP_P,
          max_tokens: MAX_TOKENS,
          stream: false,
          enable_thinking: false,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const ms = retryAfter ? Number(retryAfter) * 1000 : 60000;
        return {
          status: 'rate_limited',
          retryAfterMs: ms,
          error: buildUserError(
            'DASHSCOPE_RATE_LIMITED',
            `HTTP 429 ${res.statusText}`,
            '当前 AI 服务比较繁忙，请稍后再试（1 分钟内不要反复点击）',
          ),
        };
      }

      if (res.status >= 400) {
        const txt = await res.text().catch(() => '');
        return {
          status: 'error',
          error: buildUserError(
            `DASHSCOPE_HTTP_${res.status}`,
            `HTTP ${res.status}: ${txt || res.statusText}`,
            inputMode === 'voice'
              ? '语音识别后的解析失败，请改用粘贴文本或上传图片重试'
              : inputMode === 'image'
                ? '图片解析失败，请尝试重拍或改用粘贴文本'
                : '解析失败，请稍后重试',
          ),
        };
      }

      const json = (await res.json()) as Record<string, unknown>;
      const msg = extractAssistantMessage(json);
      if (!msg) {
        lastErr = new Error('empty assistant message');
        retries += 1;
        continue;
      }

      const blob = extractJsonBlob(msg);
      let obj: unknown;
      try {
        obj = JSON.parse(blob);
      } catch (e) {
        lastErr = e;
        retries += 1;
        continue;
      }

      const validated = validateAndNormalizeParsedItems(obj);
      return {
        status: validated.items.length === 0 ? 'invalid_json' : 'ok',
        items: validated.items,
        rawText: msg,
        truncated: validated.truncated,
        originalItemsCount: validated.original_items_count,
      };
    } catch (err) {
      lastErr = err;
      retries += 1;
    }
  } while (retries <= MAX_RETRIES);

  return {
    status: 'error',
    error: buildUserError(
      'DASHSCOPE_UNKNOWN_ERROR',
      lastErr ?? 'unknown',
      'AI 解析服务暂时不可用，请稍后重试',
    ),
  };
}

function extractTextParts(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function extractAssistantMessage(json: Record<string, unknown>): string | null {
  try {
    const choices = (json as { choices?: unknown[] }).choices;
    const firstChoice = Array.isArray(choices) ? choices[0] : null;
    if (firstChoice && typeof firstChoice === 'object') {
      const message = (firstChoice as { message?: unknown }).message;
      if (message && typeof message === 'object') {
        const content = (message as { content?: unknown }).content;
        const text = extractTextParts(content);
        if (text) return text;
      }
    }

    const output = (json as { output?: unknown }).output;
    if (!output || typeof output !== 'object') return null;
    const outputChoices = (output as { choices?: unknown[] }).choices ?? [];
    const first = outputChoices[0];
    if (!first || typeof first !== 'object') return null;
    const message = (first as { message?: unknown }).message;
    if (!message || typeof message !== 'object') return null;
    const content = (message as { content?: unknown }).content;
    const text = extractTextParts(content);
    return text || null;
  } catch {
    return null;
  }
}

export async function dashscopeCallText(rawText: string): Promise<DashScopeCallResult> {
  const result = await callCompatibleChat(
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPromptText(rawText) },
    ],
    'text',
  );
  if (result.status === 'invalid_json') {
    return {
      status: 'invalid_json',
      items: result.items ?? [],
      error: buildUserError(
        'PARSE_EMPTY_OR_INVALID',
        'compatible chat json invalid',
        '没识别到可推荐的资料，请补充完整书名（和推荐理由），或直接手工新增一本',
      ),
    };
  }
  return result;
}

export interface ImageContentItem {
  image: string;
}

export async function dashscopeCallVision(
  images: ImageContentItem[],
): Promise<DashScopeCallResult & { ocr_text_snapshot?: string }> {
  const userContent: CompatibleContentPart[] = [
    { type: 'text', text: buildUserPromptImage() },
    ...images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: img.image },
    })),
  ];

  const raw = await callCompatibleChat(
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userContent },
    ],
    'image',
    true,
  );

  const ocr_text_snapshot = raw.items
    ?.map((it) => `${it.title ?? ''} ${it.author ?? ''}\n${it.reason_summary ?? ''}\n${it.raw_source_excerpt ?? ''}`)
    .join('\n\n')
    .trim();

  if (raw.status === 'invalid_json') {
    return {
      ...raw,
      status: 'invalid_json',
      error: buildUserError(
        'OCR_EMPTY',
        'compatible vision json invalid',
        '图片未能识别出明确的推荐书籍/课程，请裁剪清楚文字区域或改用粘贴文本',
      ),
      ocr_text_snapshot,
    };
  }

  return { ...raw, ocr_text_snapshot };
}

export async function dashscopeCallVoiceAsrText(asrText: string): Promise<DashScopeCallResult> {
  const result = await callCompatibleChat(
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPromptVoice(asrText) },
    ],
    'voice',
  );
  if (result.status === 'invalid_json') {
    return {
      status: 'invalid_json',
      items: result.items ?? [],
      error: buildUserError(
        'VOICE_PARSE_EMPTY',
        'compatible voice json invalid',
        '语音没能识别出明确的推荐资料，建议改用粘贴文本，或对着麦克风说清楚书名',
      ),
    };
  }
  return result;
}

export function normalizeParsedItemDefaults(it: ParsedRecommendationItem): ParsedRecommendationItem {
  const resource_type = isResourceType(it.resource_type) ? it.resource_type : 'book';
  const domain_id = isDomainId(it.domain_id) ? it.domain_id : null;
  const ring_id = isRingId(it.ring_id) ? it.ring_id : null;
  const rating = (Number.isInteger(it.rating) && (it.rating as number) >= 1 && (it.rating as number) <= 5)
    ? (it.rating as RecommendationRating)
    : 4;
  return {
    ...it,
    resource_type,
    domain_id,
    ring_id,
    rating,
  };
}
