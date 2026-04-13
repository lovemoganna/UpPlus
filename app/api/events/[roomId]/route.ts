import { NextRequest } from "next/server";
import { subscribeToRoom, addParticipant, removeParticipant, getSubscriberCount } from "@/lib/rooms";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// GET: SSE 流，实时推送房间更新
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "anonymous";

  // 设置 SSE 流响应头
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送连接成功事件
      const connectEvent = `data: ${JSON.stringify({ type: "connected", roomId, userId })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // 添加参与者
      addParticipant(roomId, userId);

      // 定期发送 ping 保持连接
      const pingInterval = setInterval(() => {
        try {
          const pingEvent = `data: ${JSON.stringify({ type: "ping" })}\n\n`;
          controller.enqueue(encoder.encode(pingEvent));
        } catch {
          clearInterval(pingInterval);
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // 订阅房间更新
      const unsubscribe = subscribeToRoom(roomId, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // 流已关闭
        }
      });

      // 发送初始参与者数量
      const count = getSubscriberCount(roomId);
      const participantsEvent = `data: ${JSON.stringify({ type: "participants", count })}\n\n`;
      controller.enqueue(encoder.encode(participantsEvent));

      // 清理：连接关闭时
      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        clearInterval(keepAliveInterval);
        unsubscribe();
        removeParticipant(roomId, userId);
        try {
          controller.close();
        } catch {
          // 已关闭
        }
      });

      // 保活机制
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(pingInterval);
          clearInterval(keepAliveInterval);
        }
      }, 5000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
