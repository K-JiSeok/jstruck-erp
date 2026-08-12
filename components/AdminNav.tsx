'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Smartphone, Home, Users, Calculator } from 'lucide-react';
import { COMPANY_NAME, PRODUCT_NAME } from '@/lib/branding';

const NAV_ITEMS = [
  { href: '/admin', label: '홈', icon: LayoutDashboard },
  { href: '/admin/vehicles', label: '차량', icon: Truck },
  { href: '/admin/employees', label: '팀원', icon: Users },
  { href: '/admin/settlement', label: '월간리포트', icon: Calculator },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-brand-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              TN
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight text-ink-900">
                {COMPANY_NAME}
              </p>
              <p className="text-xs leading-tight text-ink-400">{PRODUCT_NAME}</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/worker"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800"
          >
            <Smartphone size={16} />
            <span className="hidden sm:inline">현장등록</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800"
          >
            <Home size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
