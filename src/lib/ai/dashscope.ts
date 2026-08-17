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

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY ?? '';
const LLM_MODEL = process.env.DASHSCOPE_LLM_MODEL ?? 'qwen-plus';
const VL_MODEL = process.env.DASHSCOPE_VL_MODEL ?? 'qwen-vl-max';
const DASHSCOPE_ENDPOINT = process.env.DASHSCOPE_ENDPOINT ?? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const VL_ENDPOINT = process.env.DASHSCOPE_VL_ENDPOINT ?? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const MAX_TOKENS = 4000;
const TEMPERATURE = 0.1;
const TOP_P = 0.7;
const MAX_RETRIES = 1;

export interface DashScopeCallResult<T = unknown> {
  status: 'ok' | 'invalid_json' | 'rate_limited' | 'error';
  items?: ParsedRecommendationItem[];
  rawText?: string;
  error?: UserFacingError;
  retryAfterMs?: number;
  truncated?: boolean;
  originalItemsCount?: number;
}

function dashscopeHeaders() {
  return {
    Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function callJson(messages: Array<{ role: 'system' | 'user'; content: unknown }>, inputMode: InputMode, isImage = false): Promise<DashScopeCallResult> {
  const started = Date.now();
  let retries = 0;
  let lastErr: unknown;
  do {
    try {
      const model = isImage ? VL_MODEL : LLM_MODEL;
      const endpoint = isImage ? VL_ENDPOINT : DASHSCOPE_ENDPOINT;
      const body: Record<string, unknown> = {
        model,
        input: { messages },
        parameters: {
          temperature: TEMPERATURE,
          top_p: TOP_P,
          max_tokens: MAX_TOKENS,
          result_format: 'message',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: dashscopeHeaders(),
        body: JSON.stringify(body),
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

function extractAssistantMessage(json: Record<string, unknown>): string | null {
  try {
    const output = (json as { output?: unknown }).output;
    if (!output || typeof output !== 'object') return null;
    const choices = (output as { choices?: unknown[] }).choices ?? [];
    const first = choices[0];
    if (!first || typeof first !== 'object') return null;
    const message = (first as { message?: unknown }).message;
    if (!message || typeof message !== 'object') return null;
    const content = (message as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((c) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object') {
            const t = (c as { text?: unknown }).text;
            return typeof t === 'string' ? t : '';
          }
          return '';
        })
        .join('');
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function dashscopeCallText(rawText: string): Promise<DashScopeCallResult> {
  const messages: Array<{ role: 'system' | 'user'; content: unknown }> = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPromptText(rawText) },
  ];
  const result = await callJson(messages, 'text');
  if (result.status === 'invalid_json') {
    return {
      status: 'invalid_json',
      items: result.items ?? [],
      error: buildUserError(
        'PARSE_EMPTY_OR_INVALID',
        `parse-duration:${Date.now()}`,
        '没识别到可推荐的资料，请补充完整书名（和推荐理由），或直接手工新增一本',
      ),
    };
  }
  return result;
}

export interface ImageContentItem {
  /** DashScope 图片输入：支持 URL 或 base64 data URI */
  image: string;
}

export async function dashscopeCallVision(images: ImageContentItem[]): Promise<DashScopeCallResult & { ocr_text_snapshot?: string }> {
  const systemPrompt = buildSystemPrompt();
  const userPromptText = buildUserPromptImage();
  const content: unknown[] = [{ text: systemPrompt + '\n\n---\n\nUSER_INSTRUCTION:\n' + userPromptText }];
  for (const img of images) {
    content.push(img);
  }
  const messages: Array<{ role: 'system' | 'user'; content: unknown }> = [
    { role: 'user', content },
  ];
  const raw = await callJson(messages, 'image', true);
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
        `parse-duration:${Date.now()}`,
        '图片未能识别出明确的推荐书籍/课程，请裁剪清楚文字区域或改用粘贴文本',
      ),
      ocr_text_snapshot,
    };
  }
  return { ...raw, ocr_text_snapshot };
}

export async function dashscopeCallVoiceAsrText(asrText: string): Promise<DashScopeCallResult> {
  const messages: Array<{ role: 'system' | 'user'; content: unknown }> = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPromptVoice(asrText) },
  ];
  const result = await callJson(messages, 'voice');
  if (result.status === 'invalid_json') {
    return {
      status: 'invalid_json',
      items: result.items ?? [],
      error: buildUserError(
        'VOICE_PARSE_EMPTY',
        `parse-duration:${Date.now()}`,
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
