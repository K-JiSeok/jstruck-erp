'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Crown,
  ChevronRight,
  ChevronDown,
  Tag,
  ShoppingBag,
  Receipt,
} from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import CategoryBadge from '@/components/CategoryBadge';
import EditExpenseModal from '@/components/EditExpenseModal';
import { Employee, EMPLOYEE_ROLE_LABEL, Expense, Vehicle, VEHICLE_STATUS_LABEL } from '@/lib/types';
import {
  listEmployees,
  listExpensesByEmployee,
  listVehiclesPurchasedBy,
  listVehiclesSoldBy,
} from '@/lib/storage';
import { useRequireSession } from '@/lib/useSession';
import { expenseCategoryLabel } from '@/lib/format';

const STATUS_BADGE: Record<string, string> = {
  in_stock: 'bg-ink-100 text-ink-600',
  contracted: 'bg-amber-100 text-amber-700',
  sold: 'bg-emerald-100 text-emerald-700',
};

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
}

function MonthlyExpenses({ expenses, onChanged }: { expenses: Expense[]; onChanged: () => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const ym = e.created_at.slice(0, 7);
      const list = map.get(ym) ?? [];
      list.push(e);
      map.set(ym, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const [openMonth, setOpenMonth] = useState<string | null>(grouped[0]?.[0] ?? null);
  const [editing, setEditing] = useState<Expense | null>(null);

  if (expenses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-white py-6 text-center text-sm text-ink-400">
        등록한 비용/영수증 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {grouped.map(([ym, list]) => {
        const total = list.reduce((sum, e) => sum + e.amount, 0);
        const open = openMonth === ym;
        return (
          <div key={ym} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            <button
              onClick={() => setOpenMonth(open ? null : ym)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-ink-50/60"
            >
              <span className="font-semibold text-ink-900">{monthLabel(ym)}</span>
              <span className="flex items-center gap-3 text-sm text-ink-500">
                {list.length}건 · {total.toLocaleString('ko-KR')}원
                <ChevronDown
                  size={16}
                  className={`text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            {open && (
              <div className="divide-y divide-ink-50 border-t border-ink-100">
                {list.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEditing(e)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50/40"
                  >
                    <span className="flex items-center gap-2">
                      <CategoryBadge category={e.category} label={expenseCategoryLabel(e)} />
                      <span className="text-sm text-ink-700">{e.vehicles?.plate_number}</span>
                      <span className="text-xs text-ink-400">{e.vendor}</span>
                    </span>
                    <span className="text-sm font-semibold text-ink-800">
                      {e.amount.toLocaleString('ko-KR')}원
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

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

function VehicleMiniList({ vehicles, emptyText }: { vehicles: Vehicle[]; emptyText: string }) {
  if (vehicles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-white py-6 text-center text-sm text-ink-400">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {vehicles.map((v) => (
        <Link
          key={v.id}
          href={`/admin/vehicles/${v.id}`}
          className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 hover:bg-ink-50/60"
        >
          <div>
            <p className="font-semibold text-ink-900">{v.plate_number}</p>
            <p className="text-xs text-ink-400">{v.vehicle_type ?? '차종 미입력'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[v.status]}`}>
              {VEHICLE_STATUS_LABEL[v.status]}
            </span>
            {v.sale_price ? (
              <span className="text-sm font-semibold text-ink-600">
                {v.sale_price.toLocaleString('ko-KR')}원
              </span>
            ) : null}
            <ChevronRight size={16} className="text-ink-300" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const session = useRequireSession();
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [sold, setSold] = useState<Vehicle[]>([]);
  const [purchased, setPurchased] = useState<Vehicle[]>([]);
  const [myExpenses, setMyExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const employees = await listEmployees();
      const found = employees.find((e) => e.id === employeeId) ?? null;
      if (!found) {
        setNotFound(true);
        return;
      }
      setEmployee(found);
      const [s, p, ex] = await Promise.all([
        listVehiclesSoldBy(employeeId),
        listVehiclesPurchasedBy(employeeId),
        listExpensesByEmployee(employeeId),
      ]);
      setSold(s);
      setPurchased(p);
      setMyExpenses(ex);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (!session) return null;

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AdminNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-400">
          직원을 찾을 수 없습니다.
          <div className="mt-4">
            <Link href="/admin/employees" className="text-brand-600 hover:underline">
              직원 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <button
          onClick={() => router.push('/admin/employees')}
          className="flex items-center gap-1 text-sm font-semibold text-ink-400 hover:text-ink-700"
        >
          <ArrowLeft size={16} />
          직원 목록
        </button>

        {loading || !employee ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            불러오는 중...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div>
                <h1 className="text-2xl font-bold text-ink-900">{employee.name}</h1>
                <p className="text-sm text-ink-400">{employee.phone ?? '연락처 미등록'}</p>
              </div>
              {employee.role === 'admin' ? (
                <span className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700">
                  <ShieldCheck size={14} />
                  관리자
                </span>
              ) : employee.role === 'ceo' ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                  <Crown size={14} />
                  대표이사
                </span>
              ) : (
                <span className="rounded-full bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-600">
                  {EMPLOYEE_ROLE_LABEL.staff}
                </span>
              )}
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink-900">
                <Tag size={16} className="text-emerald-600" />
                판매한 차량 ({sold.length}대)
              </h2>
              <VehicleMiniList vehicles={sold} emptyText="판매 완료 처리한 차량이 없습니다." />
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink-900">
                <ShoppingBag size={16} className="text-brand-600" />
                매입한 차량 ({purchased.length}대)
              </h2>
              <VehicleMiniList vehicles={purchased} emptyText="등록(매입)한 차량이 없습니다." />
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink-900">
                <Receipt size={16} className="text-amber-600" />
                등록한 비용/영수증 내역 (월별)
              </h2>
              <MonthlyExpenses expenses={myExpenses} onChanged={load} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
