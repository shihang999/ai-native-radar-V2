#!/usr/bin/env node
/**
 * 按书名回填封面：Open Library Search API 查 cover_i → 写入 resources.cover_image_url
 *
 * 用法：
 *   node scripts/fill-covers-by-title.mjs            # 试运行，只打印匹配结果，不写库
 *   node scripts/fill-covers-by-title.mjs --apply    # 实际写库
 *
 * 匹配策略（严格，宁缺毋错）：
 * 1. 标题含《》优先取书名号内文字作为检索词，去除 (...)（...）括号内容
 * 2. Open Library 返回结果需与检索词规范化后高度一致（互为子串或完全相等）
 * 3. 命中多条时取评分最高（edition_count 最大）的一条
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 .env.local 读取 Supabase 配置
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const DELAY_MS = 400; // 请求间隔，避免给 Open Library 造成压力

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 从资源标题中提取检索词：优先《》内容，去括号后缀；非书名标题返回 null */
function extractQueryTitle(title) {
  // URL、仓库地址等非书名标题直接跳过
  if (/^https?:\/\//i.test(title) || /github\.com|oreilly\.com|manning\.com/i.test(title)) {
    return null;
  }
  const inBrackets = title.match(/《(.+?)》/);
  let query = inBrackets ? inBrackets[1] : title;
  query = query
    .replace(/[（(][^）)]*[）)]/g, "") // 去括号内容
    .replace(/\s+/g, " ")
    .trim();
  return query;
}

/** 规范化标题用于比较：小写 + 只保留字母数字和 CJK 字符 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
}

/**
 * 匹配策略（宁缺毋错）：
 * 1. 精确匹配（规范化后相等）始终接受
 * 2. 子串匹配仅当查询词足够长（≥12 字符）时接受，避免短词巧合命中
 * 返回 { exact: [], substring: [] }
 */
function rankCandidates(queryTitle, docs) {
  const queryNorm = normalize(queryTitle);
  const exact = [];
  const substring = [];
  if (!queryNorm) return { exact, substring };
  for (const doc of docs) {
    const resultNorm = normalize(doc.title || "");
    if (!resultNorm || resultNorm.length < 5) continue;
    if (resultNorm === queryNorm) {
      exact.push(doc);
    } else if (
      queryNorm.length >= 12 &&
      (queryNorm.includes(resultNorm) || resultNorm.includes(queryNorm))
    ) {
      substring.push(doc);
    }
  }
  return { exact, substring };
}

/** 同档候选内取版本数最多的（最主流版本） */
function pickBest(pool) {
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => (b.edition_count || 0) - (a.edition_count || 0))[0];
}

/** 通过 OLID（作品 key）查询封面 ID，供无 cover_i 但有记录的书回退使用 */
async function fetchCoverIdByOlid(olid) {
  const res = await fetch(`https://openlibrary.org/works/${olid}.json`);
  if (!res.ok) return null;
  const work = await res.json();
  return work.covers?.find((id) => id > 0) ?? null;
}

/**
 * 生成检索词降级链：Open Library 对带副标题/标点的全名常零结果，
 * 依次尝试：完整标题 → 冒号前 → 逗号前 → 去撇号
 */
function buildQueryCandidates(queryTitle) {
  const candidates = [queryTitle];
  const beforeColon = queryTitle.split(":")[0].trim();
  const beforeComma = queryTitle.split(",")[0].trim();
  if (beforeColon && beforeColon !== queryTitle) candidates.push(beforeColon);
  if (beforeComma && beforeComma !== queryTitle) candidates.push(beforeComma);
  const noApostrophe = queryTitle.replace(/['’]/g, "");
  if (noApostrophe !== queryTitle) candidates.push(noApostrophe);
  return [...new Set(candidates)];
}

/** 按书名查 Open Library，返回封面 URL 或 null */
async function searchCoverByTitle(queryTitle) {
  let exactNoCover = null;

  for (const candidate of buildQueryCandidates(queryTitle)) {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
      candidate,
    )}&limit=25&fields=title,cover_i,edition_count,key`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ 搜索请求失败 HTTP ${res.status}`);
      await sleep(DELAY_MS);
      continue;
    }
    const data = await res.json();
    const { exact, substring } = rankCandidates(candidate, data.docs || []);

    // 1. 优先取有 cover_i 的精确匹配
    const exactWithCover = pickBest(exact.filter((d) => d.cover_i));
    if (exactWithCover) {
      return {
        coverUrl: `https://covers.openlibrary.org/b/id/${exactWithCover.cover_i}-L.jpg?default=false`,
        matchedTitle: exactWithCover.title,
      };
    }

    // 记下首个精确匹配但无 cover_i 的候选，待全部降级词试完后走 OLID 回退
    if (!exactNoCover) {
      exactNoCover = pickBest(exact);
    }

    // 2. 退而求其次：长标题的子串匹配（仅限有 cover_i）
    const subWithCover = pickBest(substring.filter((d) => d.cover_i));
    if (subWithCover) {
      return {
        coverUrl: `https://covers.openlibrary.org/b/id/${subWithCover.cover_i}-L.jpg?default=false`,
        matchedTitle: subWithCover.title,
      };
    }
    await sleep(DELAY_MS);
  }

  // 3. 精确匹配但无 cover_i → 用 OLID 查封面
  if (exactNoCover?.key) {
    const coverId = await fetchCoverIdByOlid(exactNoCover.key.replace("/works/", ""));
    if (coverId) {
      return {
        coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`,
        matchedTitle: exactNoCover.title,
      };
    }
  }
  return null;
}

async function main() {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  // 拉取所有缺封面的资源
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/resources?cover_image_url=is.null&select=id,title&limit=1000`,
    { headers },
  );
  if (!listRes.ok) {
    console.error(`拉取资源失败: HTTP ${listRes.status} ${await listRes.text()}`);
    process.exit(1);
  }
  const resources = await listRes.json();
  console.log(`共 ${resources.length} 条缺封面资源（${APPLY ? "实际写库" : "试运行"}）\n`);

  let matched = 0;
  let failed = 0;
  const queryCache = new Map(); // 重复标题只查一次

  for (const resource of resources) {
    const queryTitle = extractQueryTitle(resource.title);
    if (!queryTitle) {
      console.log(`✗ 「${resource.title}」非书名标题，跳过`);
      continue;
    }
    let result;
    if (queryCache.has(queryTitle)) {
      result = queryCache.get(queryTitle);
    } else {
      result = await searchCoverByTitle(queryTitle);
      queryCache.set(queryTitle, result);
      await sleep(DELAY_MS);
    }
    if (result) {
      matched += 1;
      console.log(`✓ 「${queryTitle}」→ 匹配「${result.matchedTitle}」`);
      if (APPLY) {
        const updateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/resources?id=eq.${resource.id}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({ cover_image_url: result.coverUrl }),
          },
        );
        if (!updateRes.ok) {
          console.error(`  ⚠ 写库失败 HTTP ${updateRes.status}: ${await updateRes.text()}`);
          failed += 1;
        }
      }
    } else {
      console.log(`✗ 「${queryTitle}」无匹配`);
    }
  }

  console.log(`\n完成：匹配 ${matched} 条，未匹配 ${resources.length - matched} 条${failed ? `，写库失败 ${failed} 条` : ""}`);
  if (!APPLY) console.log("（试运行模式，未写库。确认后执行 node scripts/fill-covers-by-title.mjs --apply）");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
