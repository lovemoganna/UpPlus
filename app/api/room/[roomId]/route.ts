import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoomContent, broadcastToRoom, createRoom } from "@/lib/rooms";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// GET: 获取房间内容（验证密码后）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const passwordHash = searchParams.get("passwordHash");

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: "房间不存在" },
        { status: 404 }
      );
    }

    // 验证密码
    if (room.passwordHash !== passwordHash) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      content: room.content,
      createdAt: room.createdAt,
      lastUpdated: room.lastUpdated,
    });
  } catch (error) {
    console.error("获取房间失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST: 更新房间内容
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { content, editorId } = body;

    if (content === undefined) {
      return NextResponse.json(
        { success: false, error: "内容不能为空" },
        { status: 400 }
      );
    }

    const room = updateRoomContent(roomId, content);
    if (!room) {
      return NextResponse.json(
        { success: false, error: "房间不存在" },
        { status: 404 }
      );
    }

    // 通过 SSE 广播更新给所有订阅者
    broadcastToRoom(
      roomId,
      JSON.stringify({
        type: "update",
        content: content,
        timestamp: room.lastUpdated,
        editor: editorId,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新内容失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT: 恢复房间数据（HMR 后客户端用 localStorage 恢复服务器内存）
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
