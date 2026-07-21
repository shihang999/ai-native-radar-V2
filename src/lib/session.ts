/**
 * 生成或获取匿名 session_id
 * 用于匿名评分机制，存储在 localStorage 中
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const STORAGE_KEY = 'ai-native-radar-session-id';
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    // 生成随机 session_id：时间戳 + 随机字符串
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}