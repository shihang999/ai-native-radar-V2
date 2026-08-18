import { NextRequest, NextResponse } from 'next/server';
import {
  dashscopeCallText,
  dashscopeCallVision,
  dashscopeCallVoiceAsrText,
  normalizeParsedItemDefaults,
  type ImageContentItem,
} from '@/lib/ai/dashscope';
import { callAliyunAsrShortAudio } from '@/lib/ai/aliyun-asr';
import type {
  ImageMeta,
  InputMode,
  ParsedOutputError,
  ParsedRecommendationItem,
  ParseRecommendationOutput,
  ParseStatus,
} from '@/lib/ai/types';
import { buildUserError, isValidUrl, validateInputMode } from '@/lib/ai/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_TEXT_LENGTH = 8000;
const MAX_IMAGES = 3;
const MAX_IMAGE_MB = 4;
const MAX_AUDIO_MB = 10;
const MAX_AUDIO_DURATION_SECONDS = 60;

type AudioMime =
  | 'audio/mpeg'
  | 'audio/mp3'
  | 'audio/wav'
  | 'audio/wave'
  | 'audio/x-wav'
  | 'audio/mp4'
  | 'audio/x-m4a'
  | 'audio/aac'
  | 'audio/webm'
  | 'audio/ogg'
  | 'audio/vorbis';

interface CoerceResult {
  mode: unknown;
  text?: string;
  images?: ImageMeta[];
  audio?: {
    mime?: AudioMime;
    duration_seconds?: number;
    data_base64?: string;
    url?: string;
    localBuffer?: Promise<ArrayBuffer>;
  };
}

interface ImageLocal {
  mime: ImageMeta['mime'];
  data_base64?: string;
  dashscopePayload: ImageContentItem;
}

function toAudioMime(raw: string): AudioMime | undefined {
  const r = raw.toLowerCase();
  if (r.includes('mpeg') || r.includes('mp3')) return 'audio/mpeg';
  if (r.includes('wav') || r.includes('wave')) return 'audio/wav';
  if (r.includes('mp4') || r.includes('m4a') || r.includes('aac')) return 'audio/mp4';
  if (r.includes('webm')) return 'audio/webm';
  if (r.includes('ogg') || r.includes('vorbis')) return 'audio/ogg';
  return undefined;
}

export async function POST(req: NextRequest): Promise<NextResponse<ParseRecommendationOutput>> {
  const startedAt = Date.now();

  let input_mode: InputMode = 'text';
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let body: unknown;
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      body = await parseFormData(form);
    } else {
      body = await req.json().catch(() => ({}));
    }

    const coerced = coerceInput(body);
    const mode: InputMode = validateInputMode(coerced.mode);
    input_mode = mode;
    const result = await routeByMode(mode, coerced);

    const elapsed = Date.now() - startedAt;
    return NextResponse.json(
      {
        parse_status: result.status,
        parse_duration_ms: elapsed,
        input_mode,
        raw_extracted_text: result.raw_extracted_text,
        ocr_text_snapshot: result.ocr_text_snapshot,
        audio_metadata: result.audio_metadata,
        items: result.items ?? [],
        error: result.error,
        rate_limit: result.rate_limit,
        warning: result.warning,
      } satisfies ParseRecommendationOutput,
      { status: 200 },
    );
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const errWrap = buildUserError(
      'PARSE_HANDLER_UNKNOWN',
      err,
      '解析服务异常，请稍后再试，或直接手工填写',
    );
    return NextResponse.json(
      {
        parse_status: 'internal_error',
        parse_duration_ms: elapsed,
        input_mode,
        items: [],
        error: errWrap,
      } satisfies ParseRecommendationOutput,
      { status: 200 },
    );
  }
}

async function parseFormData(form: FormData): Promise<CoerceResult> {
  const mode = form.get('mode');
  const text = String(form.get('raw_text') ?? '').trim();
  const durationRaw = Number(form.get('duration_seconds'));
  const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;
  const images: ImageMeta[] = [];
  let i = 0;
  while (true) {
    const f = form.get(`images[${i}]`);
    const mimeF = form.get(`images_mime[${i}]`);
    if (f == null) break;
    let mime: ImageMeta['mime'] | undefined =
      mimeF === 'image/png' || mimeF === 'image/jpeg' || mimeF === 'image/webp'
        ? mimeF
        : undefined;
    if (!mime && f instanceof File) {
      const raw = f.type.toLowerCase();
      if (raw.includes('png')) mime = 'image/png';
      else if (raw.includes('jpeg') || raw.includes('jpg')) mime = 'image/jpeg';
      else if (raw.includes('webp')) mime = 'image/webp';
    }
    if (mime && f instanceof File) {
      const bytes = Buffer.from(await f.arrayBuffer());
      images.push({ mime, data_base64: bytes.toString('base64') });
    } else if (mime) {
      images.push({ mime, url: String(f) });
    }
    i += 1;
  }

  const audioFile = form.get('audio_file');
  const audioUrl = String(form.get('audio_url') ?? '').trim();
  const audioMimeRaw = String(form.get('audio_mime') ?? '').toLowerCase();
  let mime: AudioMime | undefined = toAudioMime(audioMimeRaw);
  let audio: CoerceResult['audio'] | undefined;

  if (audioFile instanceof File) {
    if (!mime) mime = toAudioMime(audioFile.type.toLowerCase());
    audio = {
      mime,
      duration_seconds: duration,
      localBuffer: audioFile.arrayBuffer(),
    };
  } else if (audioUrl) {
    audio = { mime, duration_seconds: duration, url: audioUrl };
  }

  return { mode, text, images, audio };
}

function coerceInput(body: unknown): CoerceResult {
  if (!body || typeof body !== 'object') return { mode: 'text' };
  const b = body as Record<string, unknown>;
  const mode = (b as { mode?: unknown }).mode;
  const text = typeof b.raw_text === 'string' ? b.raw_text : undefined;
  const imagesRaw = Array.isArray((b as { images?: unknown }).images)
    ? ((b as { images: unknown[] }).images as Array<Record<string, unknown>>)
    : null;
  const images = imagesRaw
    ? imagesRaw
        .map((img): ImageMeta | null => {
          const mimeRaw = String(img.mime ?? '').toLowerCase();
          const mime =
            mimeRaw === 'image/png' || mimeRaw === 'image/jpeg' || mimeRaw === 'image/webp'
              ? mimeRaw
              : null;
          if (!mime) return null;
          const data_base64 = typeof img.data_base64 === 'string' ? img.data_base64 : undefined;
          const url = typeof img.url === 'string' ? img.url : undefined;
          return { mime, data_base64, url };
        })
        .filter((x): x is ImageMeta => !!x)
    : undefined;

  const audioRaw = (b as { audio?: unknown }).audio;
  let audio: CoerceResult['audio'] | undefined;
  if (audioRaw && typeof audioRaw === 'object') {
    const a = audioRaw as Record<string, unknown>;
    const mimeRaw = String(a.mime ?? '').toLowerCase();
    const mime: AudioMime | undefined = toAudioMime(mimeRaw);
    audio = {
      mime,
      duration_seconds: typeof a.duration_seconds === 'number' ? a.duration_seconds : undefined,
      data_base64: typeof a.data_base64 === 'string' ? a.data_base64 : undefined,
      url: typeof a.url === 'string' ? a.url : undefined,
    };
  }
  return { mode, text, images, audio };
}

interface RoutedResult {
  status: ParseStatus;
  items?: ParsedRecommendationItem[];
  raw_extracted_text?: string;
  ocr_text_snapshot?: string;
  audio_metadata?: ParseRecommendationOutput['audio_metadata'];
  error?: ParsedOutputError;
  rate_limit?: { next_retry_ms?: number };
  warning?: { items_truncated?: boolean; original_items_count?: number };
}

async function routeByMode(mode: InputMode, data: CoerceResult): Promise<RoutedResult> {
  if (mode === 'text') {
    const raw = (data.text ?? '').trim();
    if (!raw) {
      return {
        status: 'empty',
        items: [],
        error: buildUserError('EMPTY_INPUT_TEXT', 'text empty', '请粘贴一段推荐内容再解析'),
      };
    }
    if (raw.length > MAX_TEXT_LENGTH) {
      return {
        status: 'internal_error',
        items: [],
        error: buildUserError(
          'TEXT_TOO_LONG',
          `len=${raw.length}`,
          `粘贴内容过长（超过 ${MAX_TEXT_LENGTH} 字），请分段提交`,
        ),
      };
    }
    const started = Date.now();
    const res = await dashscopeCallText(raw);
    const elapsed = Date.now() - started;
    return normalizeTextCall(raw, res, elapsed);
  }

  if (mode === 'image') {
    const imgs = data.images ?? [];
    if (imgs.length === 0) {
      return {
        status: 'empty',
        items: [],
        error: buildUserError('EMPTY_IMAGE', 'no image', '请至少上传一张图片再解析'),
      };
    }
    if (imgs.length > MAX_IMAGES) {
      return {
        status: 'internal_error',
        items: [],
        error: buildUserError('IMAGE_TOO_MANY', `count=${imgs.length}`, `一次最多上传 ${MAX_IMAGES} 张图片`),
      };
    }
    const localImages: ImageLocal[] = [];
    for (const img of imgs) {
      const local = await materializeImage(img);
      if (!local) {
        return {
          status: 'internal_error',
          items: [],
          error: buildUserError(
            'IMAGE_INVALID',
            'materialize failed',
            '图片格式不正确（仅支持 PNG/JPEG/WEBP），请重新上传',
          ),
        };
      }
      if (local.data_base64 && local.data_base64.length > MAX_IMAGE_MB * 1024 * 1024 * 1.333) {
        return {
          status: 'internal_error',
          items: [],
          error: buildUserError('IMAGE_TOO_LARGE', 'image > 4MB', '单张图片超过 4MB，请压缩后再上传'),
        };
      }
      localImages.push(local);
    }
    const res = await dashscopeCallVision(localImages.map((i) => i.dashscopePayload));
    if (res.status === 'rate_limited') {
      return {
        status: 'rate_limited',
        items: [],
        error: res.error,
        rate_limit: { next_retry_ms: res.retryAfterMs },
      };
    }
    if (res.status === 'error') {
      return { status: 'internal_error', items: [], error: res.error };
    }
    if (res.status === 'invalid_json' || (res.items?.length ?? 0) === 0) {
      return {
        status: 'ocr_failed',
        items: [],
        ocr_text_snapshot: res.ocr_text_snapshot,
        error:
          res.error ??
          buildUserError('OCR_EMPTY', '', '图片未能识别出明确的推荐书籍，请裁剪清楚文字区域或改用粘贴文本'),
      };
    }
    return {
      status: 'success',
      items: (res.items ?? []).map(normalizeParsedItemDefaults),
      ocr_text_snapshot: res.ocr_text_snapshot,
      warning: {
        items_truncated: res.truncated,
        original_items_count: res.originalItemsCount,
      },
    };
  }

  // voice
  const audio = data.audio;
  const hasPayload =
    !!audio &&
    ((!!audio.data_base64 && audio.data_base64.length > 0) || !!audio.url || !!audio.localBuffer);
  if (!audio || !hasPayload) {
    return {
      status: 'empty',
      items: [],
      error: buildUserError('EMPTY_AUDIO', 'no audio', '请先录制或上传一段语音再解析'),
    };
  }
  const duration = audio.duration_seconds;
  if (typeof duration === 'number' && duration > MAX_AUDIO_DURATION_SECONDS) {
    return {
      status: 'asr_failed',
      items: [],
      error: buildUserError(
        'ASR_DURATION_TOO_LONG',
        `duration=${duration}`,
        `语音超过 ${MAX_AUDIO_DURATION_SECONDS} 秒，请拆成两段或改用粘贴文本`,
      ),
    };
  }
  let buffer: ArrayBuffer;
  const mime: AudioMime = audio.mime ?? 'audio/mpeg';
  let detectedLanguage: string | undefined;
  if (audio.localBuffer) {
    buffer = await audio.localBuffer;
  } else if (audio.url) {
    if (!isValidUrl(audio.url)) {
      return {
        status: 'asr_failed',
        items: [],
        error: buildUserError('AUDIO_URL_INVALID', audio.url, '音频链接无效，请重新上传'),
      };
    }
    const resp = await fetch(audio.url);
    if (!resp.ok || !resp.body) {
      return {
        status: 'asr_failed',
        items: [],
        error: buildUserError('AUDIO_URL_FETCH_FAILED', `HTTP ${resp.status}`, '无法下载音频，请重新上传'),
      };
    }
    const nodeBuf = Buffer.from(await resp.arrayBuffer());
    buffer = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);
  } else if (audio.data_base64) {
    try {
      const nodeBuf = Buffer.from(audio.data_base64, 'base64');
      buffer = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);
    } catch (err) {
      return {
        status: 'asr_failed',
        items: [],
        error: buildUserError('AUDIO_BASE64_INVALID', err, '音频编码错误，请重新录制'),
      };
    }
  } else {
    return {
      status: 'empty',
      items: [],
      error: buildUserError('EMPTY_AUDIO', '', '请先录制或上传一段语音再解析'),
    };
  }
  const sizeKB = Math.round(buffer.byteLength / 1024);
  if (sizeKB > MAX_AUDIO_MB * 1024) {
    return {
      status: 'asr_failed',
      items: [],
      error: buildUserError('AUDIO_TOO_LARGE', `${sizeKB}KB`, `音频文件超过 ${MAX_AUDIO_MB}MB，请压缩后再试`),
    };
  }
  const asrStarted = Date.now();
  const asr = await callAliyunAsrShortAudio({
    mime,
    audioBuffer: buffer,
    durationSeconds: duration,
  });
  if (!asr.ok || !asr.text) {
    return { status: 'asr_failed', items: [], error: asr.error };
  }
  const asrDurationMs = Date.now() - asrStarted;
  detectedLanguage = asr.language;
  const res = await dashscopeCallVoiceAsrText(asr.text);
  if (res.status === 'rate_limited') {
    return {
      status: 'rate_limited',
      items: [],
      error: res.error,
      rate_limit: { next_retry_ms: res.retryAfterMs },
    };
  }
  if (res.status === 'error') {
    return { status: 'internal_error', items: [], error: res.error };
  }
  const items = (res.items ?? []).map(normalizeParsedItemDefaults);
  return {
    status: items.length === 0 ? 'asr_failed' : 'success',
    items,
    raw_extracted_text: asr.text,
    audio_metadata: {
      asr_duration_ms: asrDurationMs,
      detected_language: detectedLanguage,
      original_duration_seconds: duration,
    },
    warning: {
      items_truncated: res.truncated,
      original_items_count: res.originalItemsCount,
    },
    error: items.length === 0
      ? (res.error ?? buildUserError('ASR_EMPTY', '', '语音没能识别出明确的推荐书籍，请改用粘贴文本或更清晰的录音'))
      : undefined,
  };
}

function normalizeTextCall(
  rawText: string,
  res: Awaited<ReturnType<typeof dashscopeCallText>>,
  _elapsedMs: number,
): RoutedResult {
  if (res.status === 'rate_limited') {
    return {
      status: 'rate_limited',
      items: [],
      error: res.error,
      rate_limit: { next_retry_ms: res.retryAfterMs },
    };
  }
  if (res.status === 'error') {
    return { status: 'internal_error', items: [], error: res.error };
  }
  if (res.status === 'invalid_json' || (res.items?.length ?? 0) === 0) {
    return {
      status: 'empty',
      items: [],
      raw_extracted_text: rawText,
      error:
        res.error ??
        buildUserError('PARSE_EMPTY', '', '没识别出可推荐的资料，请补充完整书名（和推荐理由），或直接手工新增一本'),
    };
  }
  return {
    status: 'success',
    items: (res.items ?? []).map(normalizeParsedItemDefaults),
    raw_extracted_text: rawText,
    warning: {
      items_truncated: res.truncated,
      original_items_count: res.originalItemsCount,
    },
  };
}

async function materializeImage(meta: ImageMeta): Promise<ImageLocal | null> {
  let bytes: Buffer | undefined;
  if (meta.data_base64) {
    try {
      bytes = Buffer.from(meta.data_base64, 'base64');
    } catch {
      return null;
    }
  } else if (meta.url) {
    if (!isValidUrl(meta.url)) return null;
    try {
      const r = await fetch(meta.url);
      if (!r.ok || !r.body) return null;
      bytes = Buffer.from(await r.arrayBuffer());
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const mime = meta.mime === 'image/jpeg' ? 'image/jpeg' : meta.mime;
  const b64 = bytes.toString('base64');
  const dataURI = `data:${mime};base64,${b64}`;
  return {
    mime: meta.mime,
    data_base64: b64,
    dashscopePayload: { image: dataURI },
  };
}
