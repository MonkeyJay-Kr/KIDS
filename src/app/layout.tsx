import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const display = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "찰칵이 · 우리 아이 성장 앨범",
  description:
    "사진 한 번 올리면 가족이 함께 보는 아기 성장 앨범. 초대 코드로 가족 공유.",
};

export const viewport: Viewport = {
  themeColor: "#e8f4f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
