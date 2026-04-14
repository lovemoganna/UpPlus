// 密码 SHA-256 哈希工具

/**
 * 使用 Web Crypto API 对密码进行 SHA-256 哈希
 * 返回十六进制字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * 验证密码是否匹配（比对哈希值）
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

/**
 * 生成随机房间 ID
 * 格式: 8位字母数字组合
 */
export function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成样本房间 ID（用于静态导出预生成）。
 * 36^8 ≈ 2.8 万亿种组合，预生成 5000 个使碰撞概率 < 0.001%。
 */
export const SAMPLE_ROOM_IDS: string[] = (() => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const ids = new Set<string>();
  // 用确定性种子确保每次构建生成相同的 ID 集合
  let seed = 1234567;
  while (ids.size < 5000) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    if (!ids.has(chars[seed % 36] + chars[(seed >> 5) % 36] + chars[(seed >> 10) % 36] + chars[(seed >> 15) % 36] + chars[(seed >> 20) % 36] + chars[(seed >> 25) % 36] + chars[(seed >> 30) % 36] + chars[(seed >> 35) % 36])) {
      ids.add(
        chars[seed % 36] +
        chars[(seed >> 5) % 36] +
        chars[(seed >> 10) % 36] +
        chars[(seed >> 15) % 36] +
        chars[(seed >> 20) % 36] +
        chars[(seed >> 25) % 36] +
        chars[(seed >> 30) % 36] +
        chars[(seed >> 35) % 36]
      );
    }
  }
  return [...ids];
})();

/**
 * 生成用户唯一标识（用于在线感知）
 */
export function generateUserId(): string {
  return (
    Math.random().toString(36).substring(2, 9) +
    "-" +
    Date.now().toString(36)
  );
}
