import { NextRequest, NextResponse } from "next/server";
import { subscribeToRoom, broadcastToRoom, getRoom, updateRoomContent } from "@/lib/rooms";
import { UpdateContentResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/room/[roomId]/content — SSE stream for real-time updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial room state so joiners get current content + participant count immediately
      const room = getRoom(roomId);
      if (room) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "init",
              content: room.content,
              participants: room.participants.size,
            })}\n\n`
          )
        );
      } else {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "init", content: "", participants: 0 })}\n\n`)
        );
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("data: {\"type\":\"ping\"}\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      const unsubscribe = subscribeToRoom(roomId, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      });

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
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

// POST /api/room/[roomId]/content — Broadcast content update to all subscribers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { content, editorId } = body as { content: string; editorId: string };

    const room = updateRoomContent(roomId, content);

    if (!room) {
      const res: UpdateContentResponse = { success: false, error: "room_not_found" };
      return NextResponse.json(res, { status: 404 });
    }

    broadcastToRoom(
      roomId,
      JSON.stringify({
        type: "update",
        content,
        editor: editorId,
        timestamp: Date.now(),
      })
    );

    const res: UpdateContentResponse = { success: true };
    return NextResponse.json(res);
  } catch (e) {
    console.error("[API /api/room/[roomId]/content POST]", e);
    const res: UpdateContentResponse = { success: false, error: "Server error" };
    return NextResponse.json(res, { status: 500 });
  }
}
