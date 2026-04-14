"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("__spa_redirect");
    sessionStorage.removeItem("__spa_redirect");

    // Dev mode: Next.js dev server handles routing, no redirect needed.
    // Prod mode (GitHub Pages): redirect using window.location to ensure
    // full page load so Next.js client JS can serve the SPA from the
    // correct basePath-aware URL.
    const isDev =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.port === "3000";

    if (stored) {
      // Strip basePath prefix if present
      const target = stored.replace(/^\/UpPlus/, "") || "/";
      if (isDev) {
        router.push(target);
      } else {
        window.location.replace(
          "/UpPlus" + (target.endsWith("/") ? target : target + "/")
        );
      }
    } else {
      if (isDev) {
        router.push("/");
      } else {
        window.location.replace("/UpPlus/");
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">加载中...</p>
      </div>
    </div>
  );
}
