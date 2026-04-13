// 房间数据结构
export interface Room {
  id: string;
  passwordHash: string; // SHA-256 哈希值
  content: string;       // TipTap JSON 内容
  lastUpdated: number;  // 时间戳
  createdAt: number;   // 创建时间戳
  participants: Set<string>; // 参与者 ID（用于在线感知）
}

// SSE 事件类型
export type SSEEventType = "update" | "ping" | "participants";

export interface SSEUpdateEvent {
  type: "update";
  content: string;
  timestamp: number;
  editor: string; // 触发更新的编辑器标识
}

export interface SSEPingEvent {
  type: "ping";
}

export interface SSEParticipantsEvent {
  type: "participants";
  count: number;
}

export type SSEEvent = SSEUpdateEvent | SSEPingEvent | SSEParticipantsEvent;

// API 请求/响应类型
export interface CreateRoomRequest {
  id: string;
  passwordHash: string;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
}

export interface JoinRoomRequest {
  passwordHash: string;
}

export interface JoinRoomResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface UpdateContentRequest {
  content: string;
  editorId: string;
}

export interface UpdateContentResponse {
  success: boolean;
  error?: string;
}
