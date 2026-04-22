"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { generateUserId, hashPassword, deriveKeyFromPassword } from "@/lib/crypto";
import { STORAGE_KEYS, safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/storage";
import { cacheRoom, getCachedRoom } from "@/lib/duckdb";
import PasswordGate from "@/components/PasswordGate";
import Editor from "@/components/Editor";
import ParticipantList from "@/components/ParticipantList";

type RoomState = "loading" | "password" | "verifying" | "ready";

export default function RoomClient() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const [state, setState] = useState<RoomState>("loading");
  const [initialContent, setInitialContent] = useState("");
  const [userId, setUserId] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // ---- Generate / restore persistent user ID for this room ----
  useEffect(() => {
    if (!roomId) return;
    let id = safeGetItem(STORAGE_KEYS.USER_ID(roomId));
    if (!id) {
      id = generateUserId();
      safeSetItem(STORAGE_KEYS.USER_ID(roomId), id);
    }
    setUserId(id);
  }, [roomId]);

  // ---- Open SSE connection for real-time content sync ----
    return null;
  }, [userId, basePath]);

  // ---- Joiner: verify password via API, then open SSE ----
  const handleVerifyRequest = useCallback(
    async (password: string) => {
      setVerifyError("");
      setState("verifying");

      try {
        const inputHash = await hashPassword(password);

        const res = await fetch(`${basePath}/api/room/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passwordHash: inputHash }),
        });

        if (res.status === 404) {
          throw new Error("api_not_available");
        }

        const data = await res.json();

          if (data.success) {
            safeSetItem(STORAGE_KEYS.PWD_HASH(roomId), inputHash);
            safeSetItem(STORAGE_KEYS.PWD(roomId), password);
            
            // 派生加密密钥
            const key = await deriveKeyFromPassword(password, roomId);
            setEncryptionKey(key);

            if (data.content) {
              setInitialContent(data.content);
              await cacheRoom(roomId, inputHash, data.content);
            } else {
              await cacheRoom(roomId, inputHash, "");
            }
            // openSSE 被移除，因为 Editor.tsx 会处理
            setState("ready");
          } else {
          if (data.error === "room_not_found") {
            setVerifyError("房间不存在");
          } else {
            setVerifyError("密码错误");
          }
          setState("password");
        }
      } catch (e: any) {
        const inputHash = await hashPassword(password);
        const cached = await getCachedRoom(roomId);
        
        if (cached || e.message === "api_not_available") {
          safeSetItem(STORAGE_KEYS.PWD_HASH(roomId), inputHash);
          safeSetItem(STORAGE_KEYS.PWD(roomId), password);
          
          // 派生加密密钥
          const key = await deriveKeyFromPassword(password, roomId);
          setEncryptionKey(key);

          setInitialContent(cached?.last_content || "");
          setState("ready");
          // 静态环境不开启 SSE
        } else {
          setVerifyError("连接失败且本地无缓存，请重试");
          setState("password");
        }
      }
    },
    [roomId, openSSE, basePath]
  );

  // ---- Creator: check local password, create room via API, open SSE ----
  useEffect(() => {
    if (!roomId || !userId) return;

    const savedPwd = safeGetItem(STORAGE_KEYS.PWD(roomId));

    if (savedPwd) {
      const savedContent = safeGetItem(STORAGE_KEYS.CONTENT(roomId)) || "";
      setInitialContent(savedContent);
      
      // 恢复密钥
      deriveKeyFromPassword(savedPwd, roomId).then(setEncryptionKey);
      
      setState("ready");
    } else {
      setState("password");
    }

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [roomId, userId, openSSE]);

  // ---- Creator: set password and create room via API ----
  const handlePasswordVerified = useCallback(
    async (password: string) => {
      const inputHash = await hashPassword(password);
      safeSetItem(STORAGE_KEYS.PWD(roomId), password);
      safeSetItem(STORAGE_KEYS.PWD_HASH(roomId), inputHash);

      try {
        await fetch(`${basePath}/api/room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: roomId, passwordHash: inputHash }),
        });
        await cacheRoom(roomId, inputHash, "");
      } catch {
        // API 失败（静态环境），继续运行
      }

      // openSSE 被移除
      
      // 派生加密密钥
      const key = await deriveKeyFromPassword(password, roomId);
      setEncryptionKey(key);

      setState("ready");
    },
    [roomId, openSSE, basePath]
  );

  const handlePasswordError = useCallback((err: string) => {
    console.error(err);
  }, []);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${basePath}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    safeRemoveItem(STORAGE_KEYS.PWD(roomId));
    router.push("/");
  };

  if (state === "loading" || state === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">
            {state === "verifying" ? "正在验证密码..." : "加载中..."}
          </p>
        </div>
      </div>
    );
  }

  if (state === "password") {
    return (
      <PasswordGate
        roomId={roomId}
        onVerified={handlePasswordVerified}
        onVerifyRequest={handleVerifyRequest}
        onError={handlePasswordError}
        mode="join"
        externalError={verifyError}
        onClearError={() => setVerifyError("")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
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
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-400">实时协作</p>
                {encryptionKey && (
                  <div className="flex items-center gap-0.5 px-1 rounded bg-green-50 text-[10px] font-medium text-green-600 border border-green-100">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    E2EE
                  </div>
                )}
              </div>
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
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Editor
            roomId={roomId}
            initialContent={initialContent}
            passwordHash=""
            userId={userId}
            encryptionKey={encryptionKey}
            onParticipantsChange={setParticipantCount}
          />
        </div>

        <div className="mt-4 text-center text-sm text-slate-400">
          <p>所有更改将自动保存并实时同步给同浏览器多标签页的参与者</p>
        </div>
      </main>
    </div>
  );
}
