import { Room } from "./types";

// 全局内存存储 - 房间数据
// 注意: Next.js 在开发模式下会热重载，可能导致数据丢失
// 生产环境建议使用 Redis 或数据库
const rooms = new Map<string, Room>();

// SSE 连接订阅者映射
type SSECallback = (data: string) => void;
const subscribers = new Map<string, Set<SSECallback>>();

// ==================== 房间管理 ====================

export function createRoom(roomId: string, passwordHash: string): Room {
  const room: Room = {
    id: roomId,
    passwordHash,
    content: "",
    lastUpdated: Date.now(),
    createdAt: Date.now(),
    participants: new Set(),
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function updateRoomContent(
  roomId: string,
  content: string
): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.content = content;
  room.lastUpdated = Date.now();
  return room;
}

// ==================== SSE 广播 ====================

/**
 * 订阅房间的 SSE 更新
 */
export function subscribeToRoom(
  roomId: string,
  callback: SSECallback
): () => void {
  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  subscribers.get(roomId)!.add(callback);

  // 返回取消订阅函数
  return () => {
    const roomSubs = subscribers.get(roomId);
    if (roomSubs) {
      roomSubs.delete(callback);
      if (roomSubs.size === 0) {
        subscribers.delete(roomId);
      }
    }
  };
}

/**
 * 广播消息给房间内所有订阅者
 */
export function broadcastToRoom(roomId: string, data: string): void {
  const roomSubs = subscribers.get(roomId);
  if (roomSubs) {
    roomSubs.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error("SSE broadcast error:", e);
      }
    });
  }
}

/**
 * 获取房间订阅者数量
 */
export function getSubscriberCount(roomId: string): number {
  return subscribers.get(roomId)?.size ?? 0;
}

// ==================== 参与者管理 ====================

export function addParticipant(roomId: string, userId: string): number {
  const room = rooms.get(roomId);
  if (room) {
    room.participants.add(userId);
    // 广播参与者变更
    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "participants", count: room.participants.size })
    );
    return room.participants.size;
  }
  return 0;
}

export function removeParticipant(roomId: string, userId: string): number {
  const room = rooms.get(roomId);
  if (room) {
    room.participants.delete(userId);
    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "participants", count: room.participants.size })
    );
    return room.participants.size;
  }
  return 0;
}

export function getParticipantCount(roomId: string): number {
  return rooms.get(roomId)?.participants.size ?? 0;
}
