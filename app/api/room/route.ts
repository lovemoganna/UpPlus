import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/rooms";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, passwordHash } = body;

    if (!id || !passwordHash) {
      return NextResponse.json(
        { success: false, error: "房间ID和密码不能为空" },
        { status: 400 }
      );
    }

    // 检查房间是否已存在
    const existingRoom = getRoom(id);
    if (existingRoom) {
      return NextResponse.json(
        { success: false, error: "房间ID已存在，请换一个" },
        { status: 409 }
      );
    }

    // 创建新房间
    const room = createRoom(id, passwordHash);

    return NextResponse.json({
      success: true,
      roomId: room.id,
      // 客户端需将此数据存入 localStorage，HMR 后服务器可从中恢复
      roomData: {
        id: room.id,
        passwordHash: room.passwordHash,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("创建房间失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
