"use client";

import { useEffect, useState } from "react";

interface ParticipantListProps {
  roomId: string;
  initialCount?: number;
}

export default function ParticipantList({ roomId, initialCount = 0 }: ParticipantListProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
            title={`参与者 ${i + 1}`}
          >
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        ))}
      </div>
      <span className="text-sm text-slate-500">
        {count === 0 ? "无参与者" : `${count} 人在线`}
      </span>
    </div>
  );
}
