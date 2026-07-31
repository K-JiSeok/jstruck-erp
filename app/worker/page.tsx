'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import ExpenseForm from '@/components/ExpenseForm';
import { getSession, Session } from '@/lib/session';

export default function WorkerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace('/login?redirect=/worker');
      return;
    }
    setSession(s);
  }, [router]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <p className="text-ink-400">불러오는 중...</p>
      </div>
    );
  }
  if (!session) return null; // 리다이렉트 중

  return (
    <div className="worker-shell min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-200 bg-brand-700 px-4 py-4 text-white shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 font-bold">
            JS
          </div>
          <div>
            <p className="text-base font-bold leading-tight">비용/영수증 등록</p>
            <p className="text-xs leading-tight text-white/70">제이에스매매상사</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          <ClipboardList size={14} />
          관리자
        </Link>
      </header>

      <main className="mx-auto max-w-md">
        <ExpenseForm session={session} />
      </main>
    </div>
  );
}
