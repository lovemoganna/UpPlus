import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/rooms";
import { CreateRoomRequest, CreateRoomResponse } from "@/lib/types";

// POST /api/room — Create a new room
export async function POST(request: NextRequest) {
  try {
    const body: CreateRoomRequest = await request.json();
    const { id, passwordHash } = body;

    if (!id || typeof id !== "string" || id.trim().length < 3) {
      const res: CreateRoomResponse = { success: false, error: "Invalid room ID" };
      return NextResponse.json(res, { status: 400 });
    }

    if (!passwordHash || typeof passwordHash !== "string") {
      const res: CreateRoomResponse = { success: false, error: "Password hash required" };
      return NextResponse.json(res, { status: 400 });
    }

    // If room already exists, return existing (idempotent)
    const existingRoom = await getRoom(id);
    if (existingRoom) {
      const res: CreateRoomResponse = { success: true, roomId: id };
      return NextResponse.json(res);
    }

    await createRoom(id, passwordHash);
    const res: CreateRoomResponse = { success: true, roomId: id };
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    console.error("[API /api/room POST]", e);
    const res: CreateRoomResponse = { success: false, error: "Server error" };
    return NextResponse.json(res, { status: 500 });
  }
}

// GET /api/room — Check if a room exists
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("id");

  if (!roomId) {
    return NextResponse.json({ exists: false, error: "Missing roomId" }, { status: 400 });
  }

  const room = await getRoom(roomId);
  return NextResponse.json({ exists: !!room });
}
