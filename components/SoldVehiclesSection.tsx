'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, PackageCheck } from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { formatWon } from '@/lib/format';

function yearOf(v: Vehicle) {
  return (v.sold_at ?? v.created_at).slice(0, 4);
}
function monthOf(v: Vehicle) {
  return (v.sold_at ?? v.created_at).slice(0, 7);
}
function monthLabel(ym: string) {
  const [, m] = ym.split('-');
  return `${Number(m)}월`;
}

export default function SoldVehiclesSection({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(true);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byYear = new Map<string, Map<string, Vehicle[]>>();
    for (const v of vehicles) {
      const y = yearOf(v);
      const ym = monthOf(v);
      if (!byYear.has(y)) byYear.set(y, new Map());
      const months = byYear.get(y)!;
      const list = months.get(ym) ?? [];
      list.push(v);
      months.set(ym, list);
    }
    return Array.from(byYear.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0])),
      }));
  }, [vehicles]);

  // 판매완료 차량이 있으면, 접었다 펼 것 없이 이번 달(가장 최근 달) 리스트가 바로 보이도록 한다.
  useEffect(() => {
    if (grouped.length > 0 && !openYear) {
      setOpenYear(grouped[0].year);
      setOpenMonth(grouped[0].months[0]?.[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  const total = vehicles.reduce((s, v) => s + (v.sale_price ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-base font-bold text-ink-900">
          <PackageCheck size={17} className="text-emerald-600" />
          판매완료 차량
        </span>
        <span className="flex items-center gap-2 text-sm text-ink-500">
          {vehicles.length}대 · {formatWon(total)}
          <ChevronDown size={16} className={`text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-ink-100">
          {vehicles.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">판매완료된 차량이 없습니다.</p>
          ) : (
            <div className="divide-y divide-ink-100">
              {grouped.map(({ year, months }) => {
                const yOpen = openYear === year;
                const yearCount = months.reduce((s, [, list]) => s + list.length, 0);
                const yearTotal = months.reduce(
                  (s, [, list]) => s + list.reduce((s2, v) => s2 + (v.sale_price ?? 0), 0),
                  0
                );
                return (
                  <div key={year}>
                    <button
                      onClick={() => setOpenYear(yOpen ? null : year)}
                      className="flex w-full items-center justify-between bg-ink-50/40 px-5 py-3 text-left"
                    >
                      <span className="text-sm font-bold text-ink-800">{year}년</span>
                      <span className="flex items-center gap-2 text-xs text-ink-500">
                        {yearCount}대 · {formatWon(yearTotal)}
                        <ChevronDown
                          size={14}
                          className={`text-ink-300 transition-transform ${yOpen ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>
                    {yOpen && (
                      <div className="divide-y divide-ink-50">
                        {months.map(([ym, list]) => {
                          const mOpen = openMonth === ym;
                          const monthTotal = list.reduce((s, v) => s + (v.sale_price ?? 0), 0);
                          return (
                            <div key={ym}>
                              <button
                                onClick={() => setOpenMonth(mOpen ? null : ym)}
                                className="flex w-full items-center justify-between px-6 py-2.5 text-left"
                              >
                                <span className="text-sm font-semibold text-ink-700">{monthLabel(ym)}</span>
                                <span className="flex items-center gap-2 text-xs text-ink-500">
                                  {list.length}대 · {formatWon(monthTotal)}
                                  <ChevronDown
                                    size={13}
                                    className={`text-ink-300 transition-transform ${mOpen ? 'rotate-180' : ''}`}
                                  />
                                </span>
                              </button>
                              {mOpen && (
                                <div className="divide-y divide-ink-50 bg-ink-50/20">
                                  {list.map((v) => (
                                    <Link
                                      key={v.id}
                                      href={`/admin/vehicles/${v.id}`}
                                      className="flex items-center justify-between px-8 py-2.5 hover:bg-brand-50/40"
                                    >
                                      <div>
                                        <p className="text-sm font-semibold text-ink-900">{v.plate_number}</p>
                                        <p className="text-xs text-ink-400">
                                          {v.vehicle_type ?? '차종 미입력'}
                                          {v.sold_at && <> · 판매일 {v.sold_at.slice(0, 10)}</>}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-ink-700">
                                          {formatWon(v.sale_price)}
                                        </span>
                                        <ChevronRight size={14} className="text-ink-300" />
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
