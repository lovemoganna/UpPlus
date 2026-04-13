import { NextRequest, NextResponse } from "next/server";
import { getRoom, createRoom } from "@/lib/rooms";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// GET: 验证房间密码是否正确（不返回内容）
// POST: 恢复房间数据（HMR 后客户端用 localStorage 恢复服务器端房间）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const passwordHash = searchParams.get("passwordHash");

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, exists: false, error: "房间不存在" },
        { status: 404 }
      );
    }

    const valid = room.passwordHash === passwordHash;

    return NextResponse.json({
      success: valid,
      exists: true,
      error: valid ? undefined : "密码错误",
    });
  } catch (error) {
    console.error("验证房间失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST: 恢复房间数据（HMR 后客户端用 localStorage 恢复服务器内存）
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { passwordHash, createdAt } = body;

    if (!passwordHash || !createdAt) {
      return NextResponse.json(
        { success: false, error: "缺少房间数据" },
        { status: 400 }
      );
    }

    const existingRoom = getRoom(roomId);
    if (existingRoom) {
      return NextResponse.json({ success: true, restored: false });
    }

    // 在服务器内存中重建房间（不保存 content，content 为空）
    createRoom(roomId, passwordHash);
    return NextResponse.json({ success: true, restored: true });
  } catch (error) {
    console.error("恢复房间失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
