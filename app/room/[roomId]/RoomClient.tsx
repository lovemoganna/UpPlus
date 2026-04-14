"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { generateUserId, hashPassword } from "@/lib/crypto";
import PasswordGate from "@/components/PasswordGate";
import Editor from "@/components/Editor";
import ParticipantList from "@/components/ParticipantList";

type RoomState = "loading" | "password" | "ready";

const STORAGE_KEY_PWD = (roomId: string) => `upplus_${roomId}_pwd`;
const STORAGE_KEY_CONTENT = (roomId: string) => `upplus_${roomId}_content`;
const STORAGE_KEY_PWD_HASH = (roomId: string) => `upplus_${roomId}_pwd_hash`;
const STORAGE_KEY_USERS = (roomId: string) => `upplus_${roomId}_users`;

export default function RoomClient() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string;

  const [state, setState] = useState<RoomState>("loading");
  const [initialContent, setInitialContent] = useState("");
  const [userId, setUserId] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let id = localStorage.getItem(`upplus_user_${roomId}_id`);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(`upplus_user_${roomId}_id`, id);
    }
    setUserId(id);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const savedPwd = localStorage.getItem(STORAGE_KEY_PWD(roomId));
    if (!savedPwd) {
      setState("password");
      return;
    }

    const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT(roomId)) || "";
    setInitialContent(savedContent);
    setState("ready");

    const channel = new BroadcastChannel(`upplus_${roomId}`);
    channelRef.current = channel;

    channel.postMessage(JSON.stringify({ type: "presence_join", userId }));

    const presenceTimeout = setInterval(() => {
      channel.postMessage(JSON.stringify({ type: "presence_ping", userId }));
    }, 5000);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "presence_join" || data.type === "presence_ping") {
          const usersKey = STORAGE_KEY_USERS(roomId);
          const users: Record<string, number> = JSON.parse(localStorage.getItem(usersKey) || "{}");
          users[data.userId] = Date.now();
          localStorage.setItem(usersKey, JSON.stringify(users));
          const now = Date.now();
          const activeUsers = Object.entries(users).filter(([_, t]) => now - t < 15000).length;
          setParticipantCount(activeUsers);
          channel.postMessage(JSON.stringify({ type: "presence_announce", count: activeUsers }));
        }
        if (data.type === "presence_announce") {
          setParticipantCount(data.count);
        }
      } catch { /* ignore */ }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      clearInterval(presenceTimeout);
      channel.postMessage(JSON.stringify({ type: "presence_leave", userId }));
      channel.removeEventListener("message", handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [roomId, userId]);

  const handlePasswordVerified = useCallback(
    async (password: string) => {
      localStorage.setItem(STORAGE_KEY_PWD(roomId), password);
      const hash = await hashPassword(password);
      localStorage.setItem(STORAGE_KEY_PWD_HASH(roomId), hash);
      const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT(roomId)) || "";
      setInitialContent(savedContent);
      setState("ready");
    },
    [roomId]
  );

  const handlePasswordError = useCallback((err: string) => {
    console.error(err);
  }, []);

  const handleCopyLink = async () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
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
    localStorage.removeItem(STORAGE_KEY_PWD(roomId));
    router.push("/");
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

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
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Editor
            roomId={roomId}
            initialContent={initialContent}
            passwordHash=""
            userId={userId}
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
