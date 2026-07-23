import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

function requirePublicEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} 未配置。请在项目根目录创建 .env.local 并设置 ${key}`);
  }
  return value;
}

const supabaseUrl = requirePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 导出类型定义
export type { Database };
