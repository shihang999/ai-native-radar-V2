"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "@/lib/constants";

export interface AutoSpotlightConfig {
  /** 每一轮 spotlight 在单本书上停留的秒数（闭区间内随机） */
  dwellSecondsMin?: number;
  dwellSecondsMax?: number;
  /** 用户鼠标离开所有书籍后，延迟多少秒再恢复自动 spotlight */
  resumeDelaySecondsMin?: number;
  resumeDelaySecondsMax?: number;
  /** 距离过滤：与上一次 spotlight 点的像素距离 < distanceThresholdPx 时，降低被选中概率 */
  distanceThresholdPx?: number;
  /** 点位坐标表（由雷达层计算好后传入，SVG viewBox 坐标系），用于距离过滤 */
  getBookPosition?: (book: Book) => { x: number; y: number } | undefined;
  /** 是否禁用（例如切换页面 / 在详情弹窗打开时） */
  disabled?: boolean;
}

/** 自动 Spotlight 动画阶段：enter → dwell → exit → 激活下一本书 */
export type SpotlightPhase = "enter" | "dwell" | "exit";

/** enter 阶段时长（ms）：轻微放大 → 高亮 → 编号淡出 → 封面淡入 */
const ENTER_PHASE_MS = 350;
/** exit 阶段时长（ms）：Popup 淡出 → 封面缩小 → 恢复普通编号点 */
const EXIT_PHASE_MS = 350;

export interface AutoSpotlightResult {
  /** 当前自动 spotlight 选中的书，随时可能切换 */
  autoSpotlightBook: Book | null;
  /** 当前自动 spotlight 所处动画阶段（enter/dwell/exit） */
  autoSpotlightPhase: SpotlightPhase;
  /** 自动系统是否处于播放中（用户 hover 时会被暂停，变成 false） */
  isSpotlightActive: boolean;
  /** 用户当前 hoveredBook（外部设置进去，用于抢占/暂停/延迟恢复） */
  setExternalHoveredBook: (book: Book | null) => void;
  /** 鼠标进入/离开雷达区域：进入立即停止自动 spotlight，离开后延迟恢复 */
  setPointerInsideRadar: (inside: boolean) => void;
}

interface BookWithPos {
  book: Book;
  pos: { x: number; y: number };
}

function randRange(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function buildDomainRoundRobinSequence(domains: string[]): string[] {
  const shuffled = [...domains];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 自动随机 Spotlight Hook
 *  - 3~5s 停留；1~2s 恢复延迟
 *  - 不连续同点；距离过近点（<60 SVG px）被惩罚避免连续
 *  - 分领域轮转：每次尝试切换到「不同领域」，覆盖整个雷达
 */
export function useAutoSpotlight(
  books: Book[],
  config: AutoSpotlightConfig = {},
): AutoSpotlightResult {
  const {
    dwellSecondsMin = 3,
    dwellSecondsMax = 5,
    resumeDelaySecondsMin = 1,
    resumeDelaySecondsMax = 2,
    distanceThresholdPx = 60,
    getBookPosition,
    disabled = false,
  } = config;

  const [autoSpotlightBook, setAutoSpotlightBook] = useState<Book | null>(null);
  const [autoSpotlightPhase, setAutoSpotlightPhase] = useState<SpotlightPhase>("enter");
  const [isSpotlightActive, setIsSpotlightActive] = useState(true);

  const lastBookIdRef = useRef<string | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverCountdownRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const spotlightActiveRef = useRef(true);
  /** 鼠标是否在雷达区域内（由外部通过 setPointerInsideRadar 同步） */
  const pointerInsideRef = useRef(false);

  const booksWithPos = useMemo<BookWithPos[]>(() => {
    const list: BookWithPos[] = [];
    for (const b of books) {
      const p = getBookPosition ? getBookPosition(b) : undefined;
      if (!p) continue;
      list.push({ book: b, pos: p });
    }
    return list;
  }, [books, getBookPosition]);

  const domainList = useMemo<string[]>(() => {
    const s = new Set<string>();
    books.forEach((b) => s.add(b.domainId));
    return Array.from(s);
  }, [books]);

  const domainSequenceRef = useRef<string[]>(buildDomainRoundRobinSequence(domainList));
  const domainCursorRef = useRef(0);

  function clearCycleTimers() {
    if (enterTimerRef.current != null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (dwellTimerRef.current != null) {
      window.clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }

  function clearResumeTimer() {
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  function clearHoverCountdown() {
    if (hoverCountdownRef.current != null) {
      window.clearTimeout(hoverCountdownRef.current);
      hoverCountdownRef.current = null;
    }
  }

  const pickNext = (): Book | null => {
    if (booksWithPos.length === 0) return null;
    if (booksWithPos.length === 1) return booksWithPos[0].book;

    if (domainSequenceRef.current.length === 0) {
      domainSequenceRef.current = buildDomainRoundRobinSequence(domainList);
      domainCursorRef.current = 0;
    }

    const cursor = domainCursorRef.current % domainSequenceRef.current.length;
    domainCursorRef.current = cursor + 1;
    const preferredDomain = domainSequenceRef.current[cursor];

    const lastId = lastBookIdRef.current;
    const lastPos = lastPosRef.current;

    const scored: Array<{ b: BookWithPos; score: number }> = booksWithPos
      .filter((cand) => cand.book.id !== lastId)
      .map((cand) => {
        let score = 1;
        if (cand.book.domainId === preferredDomain) score += 4;
        if (lastId && cand.book.domainId !== (lastBookIdRef.current ? books.find((b) => b.id === lastBookIdRef.current)?.domainId : null)) {
          score += 2;
        }
        if (lastPos) {
          const d = Math.hypot(cand.pos.x - lastPos.x, cand.pos.y - lastPos.y);
          if (d < distanceThresholdPx) {
            score -= 6;
          } else if (d < distanceThresholdPx * 2) {
            score -= 1;
          } else if (d > distanceThresholdPx * 3) {
            score += 2;
          }
        }
        const ratingBoost = (cand.book.rating - 3) * 0.4;
        score += ratingBoost + Math.random() * 0.8;
        return { b: cand, score };
      });

    if (scored.length === 0) {
      // 退化到只有 2 本且就是同一本时，选任意一本
      return booksWithPos[0].book;
    }

    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, Math.min(5, Math.ceil(scored.length / 2)));
    const picked = topN[Math.floor(Math.random() * topN.length)];
    return picked.b.book;
  };

  const setSpotlightActive = (v: boolean) => {
    spotlightActiveRef.current = v;
    setIsSpotlightActive(v);
  };

  /**
   * 启动一本书的完整 spotlight 周期：
   *  enter（轻微放大 → 高亮 → 编号淡出 → 封面淡入）
   *  → dwell（停留 3~5s，Popup 淡入展示）
   *  → exit（Popup 淡出 → 封面缩小 → 恢复普通编号点）
   *  → 随机激活下一本书
   */
  const startCycle = (book: Book) => {
    clearCycleTimers();
    lastBookIdRef.current = book.id;
    lastPosRef.current = booksWithPos.find((b) => b.book.id === book.id)?.pos ?? null;
    setAutoSpotlightBook(book);
    setAutoSpotlightPhase("enter");
    enterTimerRef.current = window.setTimeout(() => {
      setAutoSpotlightPhase("dwell");
      const dwellMs = Math.round(randRange(dwellSecondsMin, dwellSecondsMax) * 1000);
      dwellTimerRef.current = window.setTimeout(() => {
        setAutoSpotlightPhase("exit");
        exitTimerRef.current = window.setTimeout(() => {
          const next = pickNext();
          if (next) startCycle(next);
        }, EXIT_PHASE_MS);
      }, dwellMs);
    }, ENTER_PHASE_MS);
  };

  /** 用户离开后延迟恢复自动 spotlight（1~2s 倒计时，期间再有交互则取消） */
  const scheduleResume = () => {
    clearResumeTimer();
    clearHoverCountdown();
    const waitMs = Math.round(randRange(resumeDelaySecondsMin, resumeDelaySecondsMax) * 1000);
    hoverCountdownRef.current = window.setTimeout(() => {
      if (disabled || pointerInsideRef.current) return;
      setSpotlightActive(true);
      const first = pickNext();
      if (first) startCycle(first);
    }, waitMs);
  };

  const setPointerInsideRadar = (inside: boolean) => {
    if (pointerInsideRef.current === inside) return;
    pointerInsideRef.current = inside;
    if (inside) {
      // 鼠标进入雷达：马上回到正常模式，清除当前自动聚焦点
      setSpotlightActive(false);
      clearCycleTimers();
      clearResumeTimer();
      clearHoverCountdown();
      setAutoSpotlightBook(null);
    } else {
      // 鼠标离开雷达：若当前未在播放，延迟恢复
      if (!spotlightActiveRef.current) scheduleResume();
    }
  };

  const setExternalHoveredBook = (book: Book | null) => {
    if (book) {
      // 用户 hover 任何点：立即暂停
      setSpotlightActive(false);
      clearCycleTimers();
      clearResumeTimer();
      clearHoverCountdown();
      setAutoSpotlightBook((cur) => (cur && cur.id === book.id ? cur : null));
    } else {
      // 已在自动播放中（例如组件初始挂载），无需重复恢复
      if (spotlightActiveRef.current) return;
      // 鼠标仍在雷达区域内：保持暂停，等鼠标完全离开后再恢复
      if (pointerInsideRef.current) return;
      scheduleResume();
    }
  };

  // 初始化 & books 变化时立刻重置
  useEffect(() => {
    clearCycleTimers();
    clearResumeTimer();
    clearHoverCountdown();
    domainSequenceRef.current = buildDomainRoundRobinSequence(domainList);
    domainCursorRef.current = 0;

    if (disabled || booksWithPos.length === 0) {
      setAutoSpotlightBook(null);
      setSpotlightActive(false);
      return;
    }

    // 首次启动略延迟避免 hydration 抖动
    const startDelay = window.setTimeout(() => {
      setSpotlightActive(true);
      const first = pickNext();
      if (first) startCycle(first);
    }, 800);

    return () => {
      window.clearTimeout(startDelay);
      clearCycleTimers();
      clearResumeTimer();
      clearHoverCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booksWithPos, disabled]);

  return {
    autoSpotlightBook,
    autoSpotlightPhase,
    isSpotlightActive,
    setExternalHoveredBook,
    setPointerInsideRadar,
  };
}
