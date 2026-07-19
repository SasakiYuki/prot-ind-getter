import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineer Jobs Monitor",
  description: "Indeedのエンジニア求人件数を日次でモニタリングするPoC"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
