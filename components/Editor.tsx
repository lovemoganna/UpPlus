"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

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
  passwordHash,
  userId,
  onParticipantsChange,
  disabled = false,
}: EditorProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReceivingUpdate = useRef(false);
  const [connected, setConnected] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "在此输入内容... 多人可以实时协作编辑",
      }),
    ],
    content: initialContent ? JSON.parse(initialContent) : "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // 内容变化时，延迟保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const content = JSON.stringify(editor.getJSON());

        try {
          await fetch(`/api/room/${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              editorId: userId,
            }),
          });
        } catch (error) {
          console.error("保存内容失败:", error);
        }
      }, 500); // 500ms 防抖
    },
  });

  // 建立 SSE 连接
  useEffect(() => {
    if (!roomId || !userId) return;

    const eventSource = new EventSource(
      `/api/events/${roomId}?userId=${encodeURIComponent(userId)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            break;

          case "update":
            // 忽略自己发送的更新
            if (data.editor === userId) return;

            isReceivingUpdate.current = true;
            if (editor && data.content) {
              const parsed = JSON.parse(data.content);
              editor.commands.setContent(parsed, false);
            }
            setTimeout(() => {
              isReceivingUpdate.current = false;
            }, 100);
            break;

          case "participants":
            onParticipantsChange?.(data.count);
            break;

          case "ping":
            // 心跳，无需处理
            break;
        }
      } catch (error) {
        // 非 JSON 数据（如注释行或 keepalive）
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      // 5秒后重连
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSource.close();
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [roomId, userId, onParticipantsChange, editor]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 工具栏按钮
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
      {/* 连接状态指示器 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-slate-300"
            }`}
          />
          <span className="text-xs text-slate-500">
            {connected ? "已连接" : "连接中..."}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          多人实时编辑已开启
        </div>
      </div>

      {/* 格式化工具栏 */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="标题1"
        >
          <span className="font-bold text-sm">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="标题2"
        >
          <span className="font-bold text-sm">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="标题3"
        >
          <span className="font-bold text-sm">H3</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="粗体"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="斜体"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="删除线"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="无序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="有序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14M7 12h14M7 4h14M3 20h.01M3 12h.01M3 4h.01" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="引用"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="行内代码"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="代码块"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule()}
          title="分隔线"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().undo()}
          title="撤销"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo()}
          title="重做"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </ToolbarButton>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}
