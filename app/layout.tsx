import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام الإنتاجية | Ahmed Faris",
  description: "نظام متكامل لإدارة المهام والوقت بتقنية البومودورو",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&family=Tajawal:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
