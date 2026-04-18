import { Room } from "./types";
import { supabase } from "./supabase";

// SSE 连接订阅者映射 (内存中管理，无需持久化)
type SSECallback = (data: string) => void;
const subscribers = new Map<string, Set<SSECallback>>();

// ==================== 房间管理 ====================

export async function createRoom(roomId: string, passwordHash: string): Promise<Room> {
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (existingRoom) {
    return {
      ...existingRoom,
      participants: new Set(existingRoom.participants || [])
    };
  }

  const now = Date.now();
  const newRoom = {
    id: roomId,
    passwordHash,
    content: "",
    lastUpdated: now,
    createdAt: now,
    participants: [] // Supabase 存为 array
  };

  await supabase.from('rooms').insert([newRoom]);
  
  return { ...newRoom, participants: new Set() };
}

export async function getRoom(roomId: string): Promise<Room | undefined> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !data) return undefined;
  
  return {
    ...data,
    participants: new Set(data.participants || [])
  };
}

export async function updateRoomContent(
  roomId: string,
  content: string
): Promise<Room | undefined> {
  const { error } = await supabase
    .from('rooms')
    .update({ content, lastUpdated: Date.now() })
    .eq('id', roomId);

  if (error) return undefined;

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

export async function addParticipant(roomId: string, userId: string): Promise<number> {
  const room = await getRoom(roomId);
  if (room) {
    const participantsSet = new Set(room.participants);
    if (!participantsSet.has(userId)) {
      participantsSet.add(userId);
      const participantsArray = Array.from(participantsSet);
      
      await supabase
        .from('rooms')
        .update({ participants: participantsArray })
        .eq('id', roomId);
      
      broadcastToRoom(
        roomId,
        JSON.stringify({ type: "participants", count: participantsArray.length })
      );
      return participantsArray.length;
    }
    return participantsSet.size;
  }
  return 0;
}

export async function removeParticipant(roomId: string, userId: string): Promise<number> {
  const room = await getRoom(roomId);
  if (room) {
    const participantsSet = new Set(room.participants);
    if (participantsSet.has(userId)) {
      participantsSet.delete(userId);
      const participantsArray = Array.from(participantsSet);
      
      await supabase
        .from('rooms')
        .update({ participants: participantsArray })
        .eq('id', roomId);

      broadcastToRoom(
        roomId,
        JSON.stringify({ type: "participants", count: participantsArray.length })
      );
      return participantsArray.length;
    }
    return participantsSet.size;
  }
  return 0;
}

export async function getParticipantCount(roomId: string): Promise<number> {
  const room = await getRoom(roomId);
  return room?.participants?.size ?? 0;
}
