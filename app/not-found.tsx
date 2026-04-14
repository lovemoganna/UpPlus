"use client";

import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    const stored = sessionStorage.getItem("__spa_redirect");
    sessionStorage.removeItem("__spa_redirect");
    if (stored) {
      window.location.replace(stored);
    } else {
      window.location.replace("/");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">加载中...</p>
      </div>
    </div>
  );
}
