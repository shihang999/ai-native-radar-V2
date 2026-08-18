import {
  DASHSCOPE_API_KEY,
  DASHSCOPE_ASR_ENDPOINT,
  DASHSCOPE_ASR_MODEL,
} from './env';
import { buildUserError, type UserFacingError } from '@/lib/ai/utils';

const MAX_AUDIO_DURATION_SECONDS = 60;
const ACCEPTED_MIMES: ReadonlySet<string> = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/webm',
  'audio/ogg',
  'audio/vorbis',
]);

export interface AliyunAsrResult {
  ok: boolean;
  text?: string;
  durationSeconds?: number;
  language?: string;
  error?: UserFacingError;
  rateLimitedRetryMs?: number;
}

function normalizeAsrEndpoint(base: string): string {
  if (!base) return base;
  if (!(base.startsWith('http://') || base.startsWith('https://'))) return base;
  try {
    const url = new URL(base);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname) return `${url.origin}/api/v1/services/aigc/multimodal-generation/generation`;
    if (pathname.endsWith('/generation')) return base;
    if (pathname.endsWith('/api/v1')) return `${url.origin}${pathname}/services/aigc/multimodal-generation/generation`;
    if (pathname.endsWith('/compatible-mode/v1')) {
      return `${url.origin}/api/v1/services/aigc/multimodal-generation/generation`;
    }
    return base;
  } catch {
    return base;
  }
}

function mimeToAsrFormat(mime: string): string {
  if (mime.includes('wav') || mime.includes('wave')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('m4a') || mime.includes('mp4')) return 'mp4';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('ogg') || mime.includes('vorbis')) return 'ogg';
  if (mime.includes('webm')) return 'webm';
  return 'wav';
}

function extractAsrText(json: Record<string, unknown>): string | null {
  const output = (json as { output?: unknown }).output;
  if (output && typeof output === 'object') {
    const text = (output as { text?: unknown }).text;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }

  const choices = (json as { output?: { choices?: unknown[] } }).output?.choices;
  const first = Array.isArray(choices) ? choices[0] : null;
  if (!first || typeof first !== 'object') return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  if (!Array.isArray(content)) return null;

  const joined = content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('')
    .trim();

  return joined || null;
}

export async function callAliyunAsrShortAudio(opts: {
  mime: string;
  audioBuffer: ArrayBuffer;
  durationSeconds?: number;
  originalUrl?: string;
}): Promise<AliyunAsrResult> {
  const mime = opts.mime.toLowerCase();

  if (!DASHSCOPE_API_KEY || !DASHSCOPE_ASR_MODEL) {
    return simulateAsrForMvp(opts);
  }

  if (!ACCEPTED_MIMES.has(mime)) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_UNSUPPORTED_AUDIO_FORMAT',
        mime,
        '当前语音格式暂不支持识别，请改用 mp3/wav/m4a 上传，或直接粘贴文本',
      ),
    };
  }

  const duration = Number(opts.durationSeconds);
  if (Number.isFinite(duration) && duration > MAX_AUDIO_DURATION_SECONDS) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_DURATION_TOO_LONG',
        `duration=${duration}s`,
        `语音时长超过 ${MAX_AUDIO_DURATION_SECONDS} 秒限制，请拆成两段或改用粘贴文本`,
      ),
    };
  }

  const kb = Math.round(opts.audioBuffer.byteLength / 1024);
  if (kb < 3) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_AUDIO_TOO_SHORT',
        `size=${kb}KB`,
        '录音太短或内容为空，请录清楚推荐的书名',
      ),
    };
  }

  const format = mimeToAsrFormat(mime);
  const audioBase64 = Buffer.from(opts.audioBuffer).toString('base64');
  const dataUri = `data:${mime};base64,${audioBase64}`;

  try {
    const res = await fetch(normalizeAsrEndpoint(DASHSCOPE_ASR_ENDPOINT), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable',
      },
      body: JSON.stringify({
        model: DASHSCOPE_ASR_MODEL,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_audio',
                  input_audio: {
                    data: dataUri,
                  },
                },
              ],
            },
          ],
        },
        parameters: format === 'wav'
          ? { format, sample_rate: '16000' }
          : { format },
      }),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const ms = retryAfter ? Number(retryAfter) * 1000 : 60000;
      return {
        ok: false,
        rateLimitedRetryMs: ms,
        error: buildUserError(
          'ASR_RATE_LIMITED',
          `HTTP 429 ${res.statusText}`,
          '语音识别服务当前较忙，请稍后再试',
        ),
      };
    }

    if (res.status >= 400) {
      const txt = await res.text().catch(() => '');
      return {
        ok: false,
        error: buildUserError(
          `ASR_HTTP_${res.status}`,
          `HTTP ${res.status}: ${txt || res.statusText}`,
          '语音识别失败，请重新录制一段更清晰的语音，或改用粘贴文本',
        ),
      };
    }

    const json = (await res.json()) as Record<string, unknown>;
    const text = extractAsrText(json);
    if (!text) {
      return {
        ok: false,
        error: buildUserError(
          'ASR_EMPTY_RESULT',
          json,
          '语音识别没有返回有效文本，请重新录制一段更清晰的语音',
        ),
      };
    }

    return {
      ok: true,
      text,
      durationSeconds: Number(opts.durationSeconds) || undefined,
      language: 'zh-CN',
    };
  } catch (err) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_INTERNAL_ERROR',
        err ?? 'asr unknown',
        '语音识别服务暂时不可用，请改用粘贴文本或上传图片',
      ),
    };
  }
}

function simulateAsrForMvp(opts: { audioBuffer: ArrayBuffer; durationSeconds?: number }): AliyunAsrResult {
  const kb = Math.round(opts.audioBuffer.byteLength / 1024);
  const language = 'zh-CN';
  if (kb < 3) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_AUDIO_TOO_SHORT',
        `size=${kb}KB`,
        '录音太短或内容为空，请录清楚推荐的书名',
      ),
    };
  }
  const placeholder = `（ASR 占位：当前音频大小约 ${kb}KB，时长 ${opts.durationSeconds ?? '?'}s）`;
  return {
    ok: true,
    text: placeholder,
    durationSeconds: Number(opts.durationSeconds) || undefined,
    language,
  };
}
