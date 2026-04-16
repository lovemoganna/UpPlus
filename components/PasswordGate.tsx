"use client";

import { useState } from "react";
import { hashPassword } from "@/lib/crypto";
import { STORAGE_KEYS, safeSetItem } from "@/lib/storage";

interface PasswordGateProps {
  roomId: string;
  onVerified?: (password: string) => void;
  onVerifyRequest?: (password: string) => void;
  onError?: (error: string) => void;
  mode: "create" | "join";
  /** Error propagated from RoomClient */
  externalError?: string;
  onClearError?: () => void;
}

export default function PasswordGate({
  roomId,
  onVerified,
  onVerifyRequest,
  onError,
  mode,
  externalError = "",
  onClearError,
}: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const displayError = localError || externalError;

  const clearError = () => {
    setLocalError("");
    onClearError?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!password || password.length < 4) {
      setLocalError("密码长度至少4位");
      return;
    }

    if (mode === "create") {
      if (password !== confirmPassword) {
        setLocalError("两次密码不一致");
        return;
      }
      const hash = await hashPassword(password);
      safeSetItem(STORAGE_KEYS.PWD(roomId), password);
      safeSetItem(STORAGE_KEYS.PWD_HASH(roomId), hash);
      onVerified?.(password);
    } else {
      if (!onVerifyRequest) {
        setLocalError("验证通道未就绪");
        return;
      }
      onVerifyRequest(password);
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError("");
                  if (externalError) onClearError?.();
                }}
                placeholder={mode === "create" ? "至少4位字符" : "输入房间密码"}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900"
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
                />
              </div>
            )}

            {displayError && (
              <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">
                {displayError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {mode === "create" ? "创建房间" : "进入房间"}
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
