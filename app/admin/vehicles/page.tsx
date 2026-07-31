'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2, ChevronRight } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import VehicleForm from '@/components/VehicleForm';
import { Expense, Vehicle, VEHICLE_STATUS_LABEL } from '@/lib/types';
import { deleteVehicle, listExpenses, listVehicles } from '@/lib/storage';
import { useRequireSession } from '@/lib/useSession';
import { vehicleDisplayDate, vehicleSortDate } from '@/lib/format';

const STATUS_BADGE: Record<string, string> = {
  in_stock: 'bg-ink-100 text-ink-600',
  contracted: 'bg-amber-100 text-amber-700',
  sold: 'bg-emerald-100 text-emerald-700',
};

export default function VehiclesPage() {
  const session = useRequireSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, e] = await Promise.all([listVehicles(), listExpenses({})]);
      setVehicles(v);
      setExpenses(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  // 이전일(없으면 입고일) 기준 최신순 정렬
  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => vehicleSortDate(b).localeCompare(vehicleSortDate(a))),
    [vehicles]
  );

  const expenseCountByVehicle = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const e of expenses) {
      const cur = map.get(e.vehicle_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += e.amount;
      map.set(e.vehicle_id, cur);
    }
    return map;
  }, [expenses]);

  async function handleDelete(id: string) {
    const info = expenseCountByVehicle.get(id);
    const message = info?.count
      ? `이 차량에는 ${info.count}건의 비용 내역이 있습니다. 비용 내역도 함께 삭제됩니다. 그래도 삭제할까요?`
      : '이 차량을 삭제할까요?';
    if (!confirm(message)) return;
    await deleteVehicle(id);
    load();
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-bold text-ink-900">차량 관리</h1>
          <p className="text-sm text-ink-400">
            차량번호, 차종, 입고일을 간단히 등록하면 직원 등록 화면 드롭다운에 바로 반영됩니다.
            차량번호를 클릭하면 상세 정보 페이지로 이동합니다.
          </p>
        </div>

        <VehicleForm session={session} onCreated={() => load()} />

        {loading && (
          <div className="rounded-2xl border border-ink-200 bg-white py-12 text-center text-ink-400">
            불러오는 중...
          </div>
        )}

        {!loading && vehicles.length === 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white py-12 text-center text-ink-400">
            등록된 차량이 없습니다. 위 폼에서 차량을 먼저 등록해주세요.
          </div>
        )}

        {/* 모바일: 카드형 목록 */}
        {!loading && vehicles.length > 0 && (
          <div className="space-y-2 sm:hidden">
            {sortedVehicles.map((v) => {
              const info = expenseCountByVehicle.get(v.id);
              const dateInfo = vehicleDisplayDate(v);
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/admin/vehicles/${v.id}`}
                      className="flex items-center gap-1 text-lg font-bold text-brand-700"
                    >
                      {v.plate_number}
                      <ChevronRight size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="rounded-lg p-1.5 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{v.vehicle_type ?? '차종 미입력'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                    <span
                      className={`rounded-full px-2 py-1 font-semibold ${STATUS_BADGE[v.status]}`}
                    >
                      {VEHICLE_STATUS_LABEL[v.status]}
                    </span>
                    <span>
                      {dateInfo.label} {dateInfo.value ?? '-'}
                    </span>
                    <span>
                      {info ? `${info.count}건 · ${info.total.toLocaleString('ko-KR')}원` : '비용 없음'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PC/태블릿: 표 형태 */}
        {!loading && vehicles.length > 0 && (
          <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400">
                  <th className="px-4 py-3">차량번호</th>
                  <th className="px-4 py-3">차종</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3 text-right">등록된 비용</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedVehicles.map((v) => {
                  const info = expenseCountByVehicle.get(v.id);
                  const dateInfo = vehicleDisplayDate(v);
                  return (
                    <tr key={v.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/admin/vehicles/${v.id}`}
                          className="flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                        >
                          {v.plate_number}
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                        {v.vehicle_type ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[v.status]}`}
                        >
                          {VEHICLE_STATUS_LABEL[v.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                        <span className="text-xs text-ink-400">{dateInfo.label}</span>{' '}
                        {dateInfo.value ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-600">
                        {info ? `${info.count}건 · ${info.total.toLocaleString('ko-KR')}원` : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
