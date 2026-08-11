import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND_FULL } from '@/lib/branding';

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: '현장 결제 내역 등록 및 차량별 월말 정산 시스템',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JS 정비비 관리',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1f3d66',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
