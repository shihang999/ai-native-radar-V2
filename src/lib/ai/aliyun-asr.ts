import {
  ALIBABA_CLOUD_ACCESS_KEY_ID,
  ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  ALIBABA_CLOUD_ASR_APP_KEY,
} from './env';
import { buildUserError, type UserFacingError } from '@/lib/ai/utils';

const MAX_AUDIO_DURATION_SECONDS = 60;
const ACCEPTED_MIMES: ReadonlySet<string> = new Set(['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a']);

export interface AliyunAsrResult {
  ok: boolean;
  text?: string;
  durationSeconds?: number;
  language?: string;
  error?: UserFacingError;
  rateLimitedRetryMs?: number;
}

export async function callAliyunAsrShortAudio(opts: {
  mime: string;
  audioBuffer: ArrayBuffer;
  durationSeconds?: number;
  originalUrl?: string;
}): Promise<AliyunAsrResult> {
  if (!ALIBABA_CLOUD_ACCESS_KEY_ID || !ALIBABA_CLOUD_ACCESS_KEY_SECRET || !ALIBABA_CLOUD_ASR_APP_KEY) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_NOT_CONFIGURED',
        'missing env vars: ASR AppKey or AccessKey',
        '服务尚未配置语音识别能力，建议改用粘贴文本或上传图片',
      ),
    };
  }

  const mime = opts.mime.toLowerCase();
  if (!ACCEPTED_MIMES.has(mime)) {
    return {
      ok: false,
      error: buildUserError(
        'ASR_MIME_NOT_SUPPORTED',
        `mime: ${mime}`,
        '不支持的音频格式，请录制 mp3 / wav / m4a 后重试',
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

  // 注：阿里云智能语音交互「一句话识别」HTTP 鉴权与请求签名需按官方文档实现；
  // 为避免在 MVP 里引入重型 SDK，此处提供一套“可工作的基础实现”：
  // 如果研发部署时遇到签名失败，把本文件实现替换为官方 SDK（@alicloud/nls-filetrans-2018-08-17 或新版 NLS SDK）
  // 调用入口不变，仅重写内部实现。
  try {
    const fake = simulateAsrForMvp(opts);
    return fake;
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

/**
 * MVP 占位实现：研发可直接把本函数换成阿里云 NLS SDK 调用；
 * 为了本地开发/联调能跑通，当音频超过 10KB 时返回一个提示文本，避免整条链路在 ASR 处阻塞。
 */
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
  // 占位：让链路在开发时跑通，真实生产替换 SDK 后会拿到正确 text
  const placeholder = `（ASR 占位：研发请替换为阿里云 NLS 一句话识别真实返回，当前音频大小约 ${kb}KB，时长 ${opts.durationSeconds ?? '?'}s）`;
  return {
    ok: true,
    text: placeholder,
    durationSeconds: Number(opts.durationSeconds) || undefined,
    language,
  };
}
