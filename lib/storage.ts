/**
 * localStorage 存储工具
 * 统一管理所有 localStorage key，确保跨页面/跨路由共享数据
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
// 统一前缀，避免不同部署路径导致 localStorage 隔离
// 始终使用固定前缀确保跨页面兼容
const STORAGE_PREFIX = "upplus";

export function getStorageKey(keyType: string, roomId?: string): string {
  return roomId
    ? `${STORAGE_PREFIX}_${keyType}_${roomId}`
    : `${STORAGE_PREFIX}_${keyType}`;
}

export const STORAGE_KEYS = {
  PWD: (roomId: string) => getStorageKey("pwd", roomId),
  PWD_HASH: (roomId: string) => getStorageKey("pwd_hash", roomId),
  CONTENT: (roomId: string) => getStorageKey("content", roomId),
  USERS: (roomId: string) => getStorageKey("users", roomId),
  USER_ID: (roomId: string) => getStorageKey("user_id", roomId),
  // 用户全局 ID（不依赖 roomId）
  GLOBAL_USER_ID: () => getStorageKey("global_user_id"),
  // 跨设备跳转时待验证的密码（仅一次性使用）
  PWD_PENDING: (roomId: string) => getStorageKey("pwd_pending", roomId),
  // BroadcastChannel 消息类型（无需持久化，仅类型占位）
  CHANNEL_MSG: () => getStorageKey("channel_msg"),
} as const;

/**
 * 安全获取 localStorage 项
 */
export function safeGetItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    console.debug(`[Storage] Get: ${key} = ${value ? "****" : "null"}`);
    return value;
  } catch (e) {
    console.error(`[Storage] Failed to get item: ${key}`, e);
    return null;
  }
}

/**
 * 安全设置 localStorage 项
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    console.debug(`[Storage] Set: ${key} = ${value.substring(0, 8)}...`);
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`[Storage] Failed to set item: ${key}`, e);
    return false;
  }
}

/**
 * 安全删除 localStorage 项
 */
export function safeRemoveItem(key: string): boolean {
  try {
    console.debug(`[Storage] Remove: ${key}`);
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`[Storage] Failed to remove item: ${key}`, e);
    return false;
  }
}
