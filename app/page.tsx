"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword, generateRoomId } from "@/lib/crypto";
import { STORAGE_KEYS, safeGetItem, safeSetItem } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 4) {
      setError("密码长度至少4位");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    const id = generateRoomId();
    const passwordHash = await hashPassword(password);

    safeSetItem(STORAGE_KEYS.PWD(id), password);
    safeSetItem(STORAGE_KEYS.PWD_HASH(id), passwordHash);

    // Create room on server so joiners can verify via API
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, passwordHash }),
      });
      if (!res.ok) {
        console.error("[CreateRoom] API error:", res.status, await res.text());
      }
    } catch (e) {
      console.error("[CreateRoom] Network error:", e);
    }

    router.push(`/room/${id}`);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roomId.trim()) {
      setError("请输入房间ID");
      return;
    }

    if (!password) {
      setError("请输入密码");
      return;
    }

    const inputRoomId = roomId.trim().toLowerCase();

    // Same-device: verify locally if hash is stored
    const savedHash = safeGetItem(STORAGE_KEYS.PWD_HASH(inputRoomId));
    if (savedHash) {
      const inputHash = await hashPassword(password);
      if (savedHash !== inputHash) {
        setError("密码错误");
        return;
      }
      safeSetItem(STORAGE_KEYS.PWD(inputRoomId), password);
      router.push(`/room/${inputRoomId}`);
      return;
    }

    // Cross-device: redirect to room page; user will re-enter password at PasswordGate
    router.push(`/room/${inputRoomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md px-6">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">UpPlus</h1>
          <p className="text-slate-500 mt-2">实时内容共享与协作平台</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 mb-6">
          <button
            onClick={() => {
              setMode("create");
              setError("");
              setRoomId("");
              setConfirmPassword("");
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "create"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            创建房间
          </button>
          <button
            onClick={() => {
              setMode("join");
              setError("");
              setRoomId("");
              setPassword("");
              setConfirmPassword("");
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "join"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            加入房间
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {mode === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  设置房间密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少4位字符"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 placeholder-slate-400"
                  disabled={false}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 placeholder-slate-400"
                  disabled={false}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                创建新房间
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  房间ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toLowerCase())}
                  placeholder="输入房间ID"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 placeholder-slate-400 font-mono tracking-wider uppercase"
                  disabled={false}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  房间密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入房间密码"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 placeholder-slate-400"
                  disabled={false}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                加入房间
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          创建房间后将获得房间ID，可分享给其他人一起协作
        </p>
      </div>
    </div>
  );
}
