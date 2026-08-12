'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, LayoutDashboard, Truck, LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { clearSession, getSession, Session } from '@/lib/session';
import { BRAND_FULL } from '@/lib/branding';

export default function HomePage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSession());
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-900 via-brand-800 to-brand-950 px-6 py-16 text-white">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
          <Truck size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {BRAND_FULL}
        </h1>
        <p className="mt-2 max-w-md text-sm text-brand-100/80 sm:text-base">
          현장 결제 내역을 빠짐없이 등록하고, 차량별로 한눈에 모아 월말 정산하세요.
        </p>
      </div>

      {/* 로그인 상태 표시 */}
      <div className="mb-8">
        {session === undefined ? null : session ? (
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <UserCircle2 size={16} />
              {session.name}님으로 로그인됨
            </span>
            <button
              onClick={() => {
                clearSession();
                setSession(null);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-brand-200 hover:text-white"
            >
              <LogOut size={13} />
              로그아웃
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-800 shadow-lg hover:bg-brand-50"
          >
            <LogIn size={16} />
            로그인
          </Link>
        )}
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Link
          href="/worker"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur transition-colors hover:bg-white/10"
        >
          <div className="rounded-xl bg-brand-500/30 p-3">
            <Smartphone size={26} />
          </div>
          <h2 className="text-lg font-bold">현장등록</h2>
          <p className="text-sm text-brand-100/70">
            차량 정비/주유 등 결제 내역과 영수증 사진을 바로 등록합니다.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand-200 group-hover:underline">
            비용 등록하러 가기 →
          </span>
        </Link>

        <Link
          href="/admin"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur transition-colors hover:bg-white/10"
        >
          <div className="rounded-xl bg-brand-500/30 p-3">
            <LayoutDashboard size={26} />
          </div>
          <h2 className="text-lg font-bold">홈</h2>
          <p className="text-sm text-brand-100/70">
            전체 내역 조회, 차량/기간별 필터링, 엑셀 정산 다운로드를 진행합니다.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand-200 group-hover:underline">
            홈으로 이동 →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-xs text-brand-100/50">
        최초 1회만 로그인하면 계속 로그인 상태가 유지됩니다. 다른 사람으로 바꾸려면 위에서
        로그아웃 후 다시 로그인해주세요.
      </p>
    </div>
  );
}
