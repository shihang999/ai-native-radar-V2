// 统一环境变量读取；避免在各处散落 process.env.XXX 字符串；缺失时给出提示
function readEnv(name: string, required = false, fallback = ''): string {
  const val = process.env[name];
  if (required && (!val || val.trim().length === 0)) {
    // 仅在服务端打印；不能抛错，否则构建会失败
    if (typeof window === 'undefined') {
      console.warn(`[env] 缺少必要环境变量：${name}`);
    }
  }
  return (val ?? fallback).trim();
}

export const DASHSCOPE_API_KEY = readEnv('DASHSCOPE_API_KEY', true);
export const DASHSCOPE_LLM_MODEL = readEnv('DASHSCOPE_LLM_MODEL', false, 'qwen-plus');
export const DASHSCOPE_VL_MODEL = readEnv('DASHSCOPE_VL_MODEL', false, 'qwen-vl-max');
export const DASHSCOPE_ENDPOINT = readEnv(
  'DASHSCOPE_ENDPOINT',
  false,
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
);
export const DASHSCOPE_VL_ENDPOINT = readEnv(
  'DASHSCOPE_VL_ENDPOINT',
  false,
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
);

export const ALIBABA_CLOUD_ACCESS_KEY_ID = readEnv('ALIBABA_CLOUD_ACCESS_KEY_ID', true);
export const ALIBABA_CLOUD_ACCESS_KEY_SECRET = readEnv('ALIBABA_CLOUD_ACCESS_KEY_SECRET', true);
export const ALIBABA_CLOUD_ASR_APP_KEY = readEnv('ALIBABA_CLOUD_ASR_APP_KEY', true);
export const ALIBABA_CLOUD_ASR_ENDPOINT = readEnv(
  'ALIBABA_CLOUD_ASR_ENDPOINT',
  false,
  'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/asr',
);
