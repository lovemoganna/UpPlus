"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cacheRoom } from "@/lib/duckdb";
import { STORAGE_KEYS, safeGetItem } from "@/lib/storage";

interface EditorProps {
  roomId: string;
  initialContent: string;
  passwordHash: string;
  userId: string;
  onParticipantsChange?: (count: number) => void;
  disabled?: boolean;
}

export default function Editor({
  roomId,
  initialContent,
  userId,
  onParticipantsChange,
  disabled = false,
}: EditorProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingUpdate = useRef(false);
  const sseRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "在此输入内容... 多人可以实时协作编辑",
      }),
    ],
    content: initialContent || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const content = JSON.stringify(editor.getJSON());
        
        // 1. 同步到本地 SQL (DuckDB)
        const hash = safeGetItem(STORAGE_KEYS.PWD_HASH(roomId)) || "";
        await cacheRoom(roomId, hash, content);

        // 2. 尝试同步到服务器 API
        try {
          await fetch(`${basePath}/api/room/${roomId}/content`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, editorId: userId }),
          });
        } catch {
          // Network error
        }
      }, 300);
    },
  });

  // Keep editor content in sync when initialContent changes from SSE
  useEffect(() => {
    if (!initialContent || !editor) return;
    if (isReceivingUpdate.current) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        isReceivingUpdate.current = true;
        editor.commands.setContent(parsed, false);
        setTimeout(() => {
          isReceivingUpdate.current = false;
        }, 100);
      } catch {
        // ignore parse errors
      }
    }
  }, [initialContent, editor]);

  // Setup SSE for receiving real-time updates
  useEffect(() => {
    if (!roomId || !userId) return;

    const es = new EventSource(`${basePath}/api/room/${roomId}/content`);
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "update") {
          if (data.editor === userId) return;
          if (!editor) return;
          try {
            const parsed = JSON.parse(data.content);
            isReceivingUpdate.current = true;
            editor.commands.setContent(parsed, false);
            setTimeout(() => {
              isReceivingUpdate.current = false;
            }, 100);
          } catch {
            // ignore
          }
        }

        if (data.type === "participants" && onParticipantsChange) {
          onParticipantsChange(data.count);
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => setConnected(false);
    es.onopen = () => setConnected(true);

    return () => {
      es.close();
      sseRef.current = null;
      setConnected(false);
    };
  }, [roomId, userId, editor, onParticipantsChange, basePath]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-600"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      disabled={disabled || !editor}
    >
      {children}
    </button>
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-slate-300"}`} />
          <span className="text-xs text-slate-500">{connected ? "已连接" : "连接中..."}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="标题1">
          <span className="font-bold text-sm">H1</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="标题2">
          <span className="font-bold text-sm">H2</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="标题3">
          <span className="font-bold text-sm">H3</span>
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="粗体">
          <span className="font-bold text-sm">B</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜体">
          <span className="italic font-serif text-sm">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="删除线">
          <span className="line-through text-sm">S</span>
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="列表">
          <span className="text-sm">UL</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="代码">
          <span className="font-mono text-sm">{}</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="撤销">
          <span className="text-sm">⟲</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="重做">
          <span className="text-sm">⟳</span>
        </ToolbarButton>
      </div>

      <div className="flex-1 overflow-auto bg-white p-4">
        <EditorContent editor={editor} className="min-h-full outline-none prose prose-slate max-w-none" />
      </div>
    </div>
  );
}
