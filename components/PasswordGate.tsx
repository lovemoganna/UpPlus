"use client";

import { useState } from "react";
import { hashPassword } from "@/lib/crypto";

interface PasswordGateProps {
  roomId: string;
  onVerified: (password: string) => void;
  onError: (error: string) => void;
  mode: "create" | "join";
}

export default function PasswordGate({
  roomId,
  onVerified,
  onError,
  mode,
}: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const savePassword = (pwd: string) => {
    localStorage.setItem(`room_${roomId}_pwd`, pwd);
  };

  const verifyRoom = async () => {
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const passwordHash = await hashPassword(password);

      if (mode === "join") {
        const res = await fetch(
          `/api/room/${roomId}/verify?passwordHash=${encodeURIComponent(passwordHash)}`
        );
        const data = await res.json();

        if (!data.exists) {
          setError("房间不存在");
          onError("房间不存在");
          return;
        }

        if (!data.success) {
          setError("密码错误");
          onError("密码错误");
          return;
        }
      }

      savePassword(password);
      onVerified(password);
    } catch {
      setError("网络错误，请重试");
      onError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      if (!password || password.length < 4) {
        setError("密码长度至少4位");
        return;
      }
      if (password !== confirmPassword) {
        setError("两次密码不一致");
        return;
      }

      setLoading(true);
      setError("");

      try {
        savePassword(password);
        onVerified(password);
      } catch {
        setError("网络错误，请重试");
      } finally {
        setLoading(false);
      }
    } else {
      verifyRoom();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === "create" ? "设置房间密码" : "输入房间密码"}
          </h2>
          <p className="text-slate-500 mt-2 font-mono text-sm bg-slate-100 inline-block px-3 py-1 rounded-full">
            房间: {roomId}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {mode === "create" ? "设置密码" : "房间密码"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "create" ? "至少4位字符" : "输入房间密码"}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900"
                disabled={loading}
                autoFocus
              />
            </div>

            {mode === "create" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  验证中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {mode === "create" ? "创建房间" : "进入房间"}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          {mode === "create"
            ? "设置密码后，其他用户需要密码才能加入"
            : "请输入房间创建者设置的密码"}
        </p>
      </div>
    </div>
  );
}
