// 密码 SHA-256 哈希工具

/**
 * 获取 crypto.subtle 对象（兼容浏览器和服务端环境）
 */
function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    return globalThis.crypto.subtle;
  }
  if (typeof (globalThis as any).msCrypto?.subtle !== "undefined") {
    return (globalThis as any).msCrypto.subtle;
  }
  return null;
}

/**
 * 使用 Web Crypto API 对密码进行 SHA-256 哈希
 * 返回十六进制字符串
 * 如果 Web Crypto API 不可用，使用纯 JS 实现
 */
export async function hashPassword(password: string): Promise<string> {
  const subtle = getSubtleCrypto();

  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }

  // 备选：使用纯 JavaScript SHA-256 实现
  return sha256Fallback(password);
}

/**
 * 纯 JavaScript SHA-256 实现（备选方案）
 */
function sha256Fallback(message: string): string {
  // SHA-256 常量
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // 初始哈希值
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  // 辅助函数
  function rotr(n: number, x: number): number {
    return (x >>> n) | (x << (32 - n));
  }
  function ch(x: number, y: number, z: number): number {
    return (x & y) ^ (~x & z);
  }
  function maj(x: number, y: number, z: number): number {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function sigma0(x: number): number {
    return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
  }
  function sigma1(x: number): number {
    return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
  }
  function gamma0(x: number): number {
    return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
  }
  function gamma1(x: number): number {
    return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
  }
  function add32(a: number, b: number): number {
    return ((a + b) | 0) >>> 0;
  }

  // 消息预处理
  const msgBytes = new TextEncoder().encode(message);
  const msgLen = msgBytes.length;
  let paddedLen = msgLen + 1;
  while (paddedLen % 64 !== 56) {
    paddedLen++;
  }
  paddedLen += 8;
  const padded = new Uint8Array(paddedLen);
  padded.set(msgBytes);
  padded[msgLen] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 4, msgLen * 8, false);

  const h = H.slice();
  let offset = 0;

  while (offset < paddedLen) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) {
      w[j] = dv.getUint32(offset + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      w[j] = add32(add32(gamma1(w[j - 2]), w[j - 7]), add32(gamma0(w[j - 15]), w[j - 16]));
    }

    let a = h[0], b = h[1], c = h[2], d = h[3];
    let e = h[4], f = h[5], g = h[6], hh = h[7];

    for (let j = 0; j < 64; j++) {
      const t1 = add32(add32(add32(add32(hh, sigma1(e)), ch(e, f, g)), K[j]), w[j]);
      const t2 = add32(sigma0(a), maj(a, b, c));
      hh = g; g = f; f = e; e = add32(d, t1);
      d = c; c = b; b = a; a = add32(t1, t2);
    }

    h[0] = add32(h[0], a); h[1] = add32(h[1], b); h[2] = add32(h[2], c); h[3] = add32(h[3], d);
    h[4] = add32(h[4], e); h[5] = add32(h[5], f); h[6] = add32(h[6], g); h[7] = add32(h[7], hh);
    offset += 64;
  }

  const hex = Array.from(h).map((n) => n.toString(16).padStart(8, "0")).join("");
  return hex;
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
