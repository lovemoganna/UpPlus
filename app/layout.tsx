import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UpPlus - 实时内容共享",
  description: "支持内容实时共享与密码访问控制的协作平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
