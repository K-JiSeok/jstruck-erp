'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, Session } from './session';

export function useRequireSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setSession(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return session;
}
