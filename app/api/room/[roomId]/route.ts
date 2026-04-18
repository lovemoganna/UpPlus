import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms";
import { JoinRoomResponse } from "@/lib/types";

// POST /api/room/[roomId] — Join (verify password) and get room content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { passwordHash } = body as { passwordHash: string };

    const room = await getRoom(roomId);

    if (!room) {
      const res: JoinRoomResponse = { success: false, error: "room_not_found" };
      return NextResponse.json(res, { status: 404 });
    }

    if (room.passwordHash !== passwordHash) {
      const res: JoinRoomResponse = { success: false, error: "wrong_password" };
      return NextResponse.json(res, { status: 401 });
    }

    const res: JoinRoomResponse = { success: true, content: room.content };
    return NextResponse.json(res);
  } catch (e) {
    console.error("[API /api/room/[roomId] POST]", e);
    const res: JoinRoomResponse = { success: false, error: "Server error" };
    return NextResponse.json(res, { status: 500 });
  }
}
