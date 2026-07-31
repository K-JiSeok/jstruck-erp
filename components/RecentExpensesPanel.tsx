'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { Expense } from '@/lib/types';
import { expenseCategoryLabel } from '@/lib/format';
import CategoryBadge from './CategoryBadge';
import EditExpenseModal from './EditExpenseModal';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExpenseRow({ e, onClick }: { e: Expense; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-ink-50"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <CategoryBadge category={e.category} label={expenseCategoryLabel(e)} />
          <span className="truncate text-sm font-semibold text-ink-800">
            {e.vehicles?.plate_number}
          </span>
        </div>
        <span className="truncate text-xs text-ink-400">
          {formatTime(e.created_at)} · {e.vendor}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-bold text-ink-900">{e.amount.toLocaleString('ko-KR')}원</span>
        <Pencil size={14} className="text-ink-300" />
      </div>
    </button>
  );
}

export default function RecentExpensesPanel({
  expenses,
  onChanged,
}: {
  expenses: Expense[];
  onChanged: () => void;
}) {
  const [pastOpen, setPastOpen] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  const todayList = useMemo(
    () => expenses.filter((e) => e.created_at.slice(0, 10) === todayKey()),
    [expenses]
  );
  const pastList = useMemo(
    () => expenses.filter((e) => e.created_at.slice(0, 10) !== todayKey()),
    [expenses]
  );
  const pastTotal = pastList.reduce((sum, e) => sum + e.amount, 0);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of pastList) {
      const ym = e.created_at.slice(0, 7);
      const list = map.get(ym) ?? [];
      list.push(e);
      map.set(ym, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [pastList]);

  return (
    <div className="px-4 pb-10 pt-6">
      <h2 className="mb-1 text-base font-bold text-ink-700">최근 등록한 내역</h2>
      <p className="mb-3 text-xs text-ink-400">잘못 등록한 내용은 눌러서 바로 수정할 수 있어요.</p>

      {/* 오늘 등록한 목록 */}
      <div className="mb-3 overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-ink-900">오늘</span>
          <span className="text-sm text-ink-500">
            {todayList.length}건 · {todayList.reduce((s, e) => s + e.amount, 0).toLocaleString('ko-KR')}원
          </span>
        </div>
        {todayList.length === 0 ? (
          <p className="border-t border-ink-100 px-4 py-6 text-center text-sm text-ink-400">
            오늘 등록한 내역이 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-ink-50 border-t border-ink-100">
            {todayList.map((e) => (
              <ExpenseRow key={e.id} e={e} onClick={() => setEditing(e)} />
            ))}
          </div>
        )}
      </div>

      {/* 최근 전체 (오늘 이전) - 접었다 펼치면 월별로 표시 */}
      {pastList.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-semibold text-ink-900">최근 전체</span>
            <span className="flex items-center gap-2 text-sm text-ink-500">
              {pastList.length}건 · {pastTotal.toLocaleString('ko-KR')}원
              <ChevronDown
                size={16}
                className={`text-ink-300 transition-transform ${pastOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {pastOpen && (
            <div className="divide-y divide-ink-100 border-t border-ink-100">
              {groupedByMonth.map(([ym, list]) => {
                const total = list.reduce((sum, e) => sum + e.amount, 0);
                const open = openMonth === ym;
                return (
                  <div key={ym}>
                    <button
                      type="button"
                      onClick={() => setOpenMonth(open ? null : ym)}
                      className="flex w-full items-center justify-between bg-ink-50/60 px-4 py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold text-ink-700">{monthLabel(ym)}</span>
                      <span className="flex items-center gap-2 text-xs text-ink-500">
                        {list.length}건 · {total.toLocaleString('ko-KR')}원
                        <ChevronDown
                          size={14}
                          className={`text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>
                    {open && (
                      <div className="divide-y divide-ink-50">
                        {list.map((e) => (
                          <ExpenseRow key={e.id} e={e} onClick={() => setEditing(e)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditExpenseModal
          expense={editing}
          onClose={() => setEditing(null)}
          onUpdated={onChanged}
          onDeleted={onChanged}
        />
      )}
    </div>
  );
}
