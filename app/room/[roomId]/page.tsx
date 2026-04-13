"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { generateUserId, hashPassword } from "@/lib/crypto";
import PasswordGate from "@/components/PasswordGate";
import Editor from "@/components/Editor";
import ParticipantList from "@/components/ParticipantList";

type RoomState = "loading" | "password" | "ready" | "error";

export default function RoomClient() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const [state, setState] = useState<RoomState>("loading");
  const [error, setError] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [userId, setUserId] = useState("");
  const [passwordHash, setPasswordHash] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // 初始化用户 ID
  useEffect(() => {
    let id = localStorage.getItem(`user_${roomId}_id`);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(`user_${roomId}_id`, id);
    }
    setUserId(id);
  }, [roomId]);

  // 读取 localStorage 中的密码
  const getPasswordFromStorage = useCallback(() => {
    return localStorage.getItem(`room_${roomId}_pwd`);
  }, [roomId]);

  const savePasswordToStorage = useCallback((password: string) => {
    localStorage.setItem(`room_${roomId}_pwd`, password);
  }, [roomId]);

  // 页面加载时检查密码
  useEffect(() => {
    const savedPassword = getPasswordFromStorage();
    if (!savedPassword) {
      setState("password");
      return;
    }

    // 自动验证密码
    const verifyPassword = async () => {
      try {
        // 先尝试从 localStorage 恢复房间数据（HMR 后服务器内存已清空）
        const roomDataRaw = localStorage.getItem(`room_${roomId}_data`);
        if (roomDataRaw) {
          try {
            const roomData = JSON.parse(roomDataRaw);
            await fetch(`/api/room/${roomId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                passwordHash: roomData.passwordHash,
                createdAt: roomData.createdAt,
              }),
            });
          } catch { /* 恢复失败，继续用密码验证 */ }
        }

        const hash = await hashPassword(savedPassword);
        const res = await fetch(
          `/api/room/${roomId}?passwordHash=${encodeURIComponent(hash)}`
        );
        const data = await res.json();

        if (data.success) {
          setPasswordHash(hash);
          setInitialContent(data.content || "");
          setState("ready");
        } else {
          setState("password");
        }
      } catch {
        setError("加载房间失败");
        setState("error");
      }
    };

    verifyPassword();
  }, [roomId, getPasswordFromStorage]);

  const handlePasswordVerified = useCallback(
    async (password: string) => {
      savePasswordToStorage(password);
      try {
        // 先尝试从 localStorage 恢复房间数据（HMR 后服务器内存已清空）
        const roomDataRaw = localStorage.getItem(`room_${roomId}_data`);
        if (roomDataRaw) {
          try {
            const roomData = JSON.parse(roomDataRaw);
            await fetch(`/api/room/${roomId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                passwordHash: roomData.passwordHash,
                createdAt: roomData.createdAt,
              }),
            });
          } catch { /* 恢复失败，继续用密码验证 */ }
        }

        const hash = await hashPassword(password);
        const res = await fetch(
          `/api/room/${roomId}?passwordHash=${encodeURIComponent(hash)}`
        );
        const data = await res.json();
        if (data.success) {
          setPasswordHash(hash);
          setInitialContent(data.content || "");
          setState("ready");
        } else {
          setError("密码验证失败");
          setState("password");
        }
      } catch {
        setError("网络错误");
        setState("error");
      }
    },
    [roomId, savePasswordToStorage]
  );

  const handlePasswordError = useCallback((err: string) => {
    setError(err);
  }, []);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(`room_${roomId}_pwd`);
    window.location.href = "/";
  };

  // 加载状态
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">正在连接房间...</p>
        </div>
      </div>
    );
  }

  // 密码验证
  if (state === "password") {
    return (
      <PasswordGate
        roomId={roomId}
        onVerified={handlePasswordVerified}
        onError={handlePasswordError}
        mode="join"
      />
    );
  }

  // 错误状态
  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">加载失败</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 就绪状态 - 显示编辑器
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveRoom}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            title="离开房间"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">UpPlus</h1>
              <p className="text-xs text-slate-400">实时协作</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="复制链接"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ParticipantList roomId={roomId} initialCount={participantCount} />

          <button
            onClick={() => {
              const pwd = getPasswordFromStorage();
              if (pwd) {
                navigator.clipboard.writeText(pwd);
              }
            }}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            title="复制房间密码"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            密码
          </button>
        </div>
      </header>

      {/* 编辑器区域 */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Editor
            roomId={roomId}
            initialContent={initialContent}
            passwordHash={passwordHash}
            userId={userId}
            onParticipantsChange={setParticipantCount}
          />
        </div>

        {/* 提示信息 */}
        <div className="mt-4 text-center text-sm text-slate-400">
          <p>所有更改将自动保存并实时同步给房间内的所有参与者</p>
        </div>
      </main>
    </div>
  );
}
