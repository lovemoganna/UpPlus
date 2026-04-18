import { Room } from "./types";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import path from "path";
import fs from "fs";

// 数据库存储结构
interface Schema {
  rooms: Room[];
}

// 确保数据目录存在
const isProd = process.env.NODE_ENV === "production";
const DATA_DIR = isProd ? "/tmp/upplus-data" : path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化 lowdb
const adapter = new FileSync<Schema>(path.join(DATA_DIR, "db.json"));
const db = low(adapter);

// 设置默认值
db.defaults({ rooms: [] }).write();

// SSE 连接订阅者映射 (内存中管理，无需持久化)
type SSECallback = (data: string) => void;
const subscribers = new Map<string, Set<SSECallback>>();

// ==================== 房间管理 ====================

export function createRoom(roomId: string, passwordHash: string): Room {
  const existingRoom = db.get("rooms").find({ id: roomId }).value();
  
  if (existingRoom) {
    return existingRoom;
  }

  const newRoom: Room = {
    id: roomId,
    passwordHash,
    content: "",
    lastUpdated: Date.now(),
    createdAt: Date.now(),
    participants: [] as any, // 在持久化时存为数组
  };

  db.get("rooms").push(newRoom).write();
  
  // 返回时确保 participants 是 Set，以兼容现有逻辑
  return { ...newRoom, participants: new Set() };
}

export function getRoom(roomId: string): Room | undefined {
  const roomData = db.get("rooms").find({ id: roomId }).value();
  if (!roomData) return undefined;
  
  // 转换 participants 为 Set，因为 JSON 不支持存储 Set
  return {
    ...roomData,
    participants: new Set(roomData.participants || [])
  };
}

export function updateRoomContent(
  roomId: string,
  content: string
): Room | undefined {
  const room = db.get("rooms").find({ id: roomId }).value();
  if (!room) return undefined;

  db.get("rooms")
    .find({ id: roomId })
    .assign({ content, lastUpdated: Date.now() })
    .write();

  return getRoom(roomId);
}

// ==================== SSE 广播 ====================

export function subscribeToRoom(
  roomId: string,
  callback: SSECallback
): () => void {
  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  subscribers.get(roomId)!.add(callback);

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

export function getSubscriberCount(roomId: string): number {
  return subscribers.get(roomId)?.size ?? 0;
}

// ==================== 参与者管理 ====================

export function addParticipant(roomId: string, userId: string): number {
  const room = getRoom(roomId);
  if (room) {
    const participants = Array.from(room.participants);
    if (!participants.includes(userId)) {
      participants.push(userId);
      db.get("rooms")
        .find({ id: roomId })
        .assign({ participants })
        .write();
    }
    
    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "participants", count: participants.length })
    );
    return participants.length;
  }
  return 0;
}

export function removeParticipant(roomId: string, userId: string): number {
  const room = getRoom(roomId);
  if (room) {
    let participants = Array.from(room.participants);
    participants = participants.filter(id => id !== userId);
    
    db.get("rooms")
      .find({ id: roomId })
      .assign({ participants })
      .write();

    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "participants", count: participants.length })
    );
    return participants.length;
  }
  return 0;
}

export function getParticipantCount(roomId: string): number {
  const room = getRoom(roomId);
  return room?.participants?.size ?? 0;
}
