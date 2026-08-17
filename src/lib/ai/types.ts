export const RESOURCE_TYPES = ['book', 'course', 'article'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const REJECT_REASON_CATEGORIES = [
  'insufficient_info',
  'wrong_fields',
  'duplicate',
  'low_quality',
  'recommender_invalid',
  'other',
] as const;
export type RejectReasonCategory = (typeof REJECT_REASON_CATEGORIES)[number];

export const INPUT_MODES = ['text', 'image', 'voice', 'manual'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

export const SOURCES = ['ai_parsed', 'manual'] as const;
export type Source = (typeof SOURCES)[number];

export type RecommendationRating = 1 | 2 | 3 | 4 | 5;

export interface FieldConfidence {
  title?: number;
  author?: number;
  resource_type?: number;
  resource_url?: number;
  domain_id?: number;
  ring_id?: number;
  rating?: number;
  reason_summary?: number;
  overall: number;
}

export interface ParsedRecommendationItem {
  title: string | null;
  author?: string | null;
  resource_type: ResourceType | null;
  resource_url?: string | null;
  domain_id?: string | null;
  ring_id?: string | null;
  rating?: RecommendationRating | null;
  reason_summary: string;
  confidence: FieldConfidence;
  raw_source_excerpt?: string;
}

export type ParseStatus =
  | 'success'
  | 'empty'
  | 'invalid_json'
  | 'ocr_failed'
  | 'asr_failed'
  | 'rate_limited'
  | 'internal_error';

export interface ParsedOutputError {
  code: string;
  message: string;
  user_message: string;
}

export interface ParseRecommendationOutput {
  parse_status: ParseStatus;
  parse_duration_ms: number;
  input_mode: InputMode;
  raw_extracted_text?: string;
  ocr_text_snapshot?: string;
  audio_metadata?: {
    asr_duration_ms?: number;
    detected_language?: string;
    original_duration_seconds?: number;
  };
  items: ParsedRecommendationItem[];
  error?: ParsedOutputError;
  rate_limit?: { next_retry_ms?: number };
  warning?: {
    items_truncated?: boolean;
    original_items_count?: number;
  };
}

export interface AudioMeta {
  mime?: 'audio/mpeg' | 'audio/wav' | 'audio/mp4';
  duration_seconds?: number;
  data_base64?: string;
  url?: string;
  asr_text?: string;
}

export interface ImageMeta {
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  data_base64?: string;
  url?: string;
  ocr_text_snapshot?: string;
}

export type ParsedInputPayload =
  | { mode: 'text'; raw_text: string }
  | { mode: 'image'; images: ImageMeta[] }
  | { mode: 'voice'; audio: AudioMeta };
