'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/lib/types';
import CategoryBadge from './CategoryBadge';

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: ExpenseCategory | '';
  onChange: (category: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = EXPENSE_CATEGORIES.filter((c) => c.includes(query));

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-4 text-left text-lg font-semibold transition-colors ${
          value
            ? 'border-brand-500 bg-brand-50 text-brand-800'
            : 'border-ink-200 bg-white text-ink-400'
        }`}
      >
        <span>{value || '비용 항목을 선택하세요'}</span>
        <ChevronDown size={22} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
            <Search size={18} className="text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="항목 검색 (예: 세차, 수리비)"
              lang="ko"
              className="w-full py-2 text-base outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-400">일치하는 항목이 없습니다.</p>
            )}
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-50"
              >
                <CategoryBadge category={c} />
                {c === value && <Check size={18} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
