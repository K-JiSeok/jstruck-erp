'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Receipt, Truck, Download, FileSpreadsheet, Radio } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import StatCard from '@/components/StatCard';
import ExpenseFiltersBar from '@/components/ExpenseFiltersBar';
import ExpenseTable from '@/components/ExpenseTable';
import { Expense, ExpenseFilters, Vehicle } from '@/lib/types';
import { deleteExpense, listExpenses, listVehicles, subscribeRealtime } from '@/lib/storage';
import { exportExpensesByVehicle, exportExpensesToExcel } from '@/lib/export';
import { useRequireSession } from '@/lib/useSession';

function isThisMonth(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function AdminDashboardPage() {
  const session = useRequireSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [v, e] = await Promise.all([listVehicles(), listExpenses({})]);
      setVehicles(v);
      setAllExpenses(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    const unsub = subscribeRealtime(load);
    return unsub;
  }, [session, load]);

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  useEffect(() => {
    listExpenses(filters).then(setFilteredExpenses);
  }, [filters, allExpenses]);

  const monthExpenses = useMemo(() => allExpenses.filter((e) => isThisMonth(e.created_at)), [
    allExpenses,
  ]);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  async function handleDelete(id: string) {
    await deleteExpense(id);
    load();
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-900">정산 대시보드</h1>
            <p className="text-sm text-ink-400">이번 달 현장 결제 내역을 확인하고 엑셀로 정산하세요.</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
            <Radio size={12} className="animate-pulse" />
            실시간 연결됨
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="이번 달 총 지출"
            value={`${monthTotal.toLocaleString('ko-KR')}원`}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="이번 달 등록 건수"
            value={`${monthExpenses.length}건`}
            icon={Receipt}
            tone="neutral"
          />
          <StatCard
            label="등록된 차량 수"
            value={`${vehicles.length}대`}
            icon={Truck}
            tone="neutral"
          />
        </div>

        <ExpenseFiltersBar vehicles={vehicles} filters={filters} onChange={setFilters} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">
            조회된 내역{' '}
            <span className="font-bold text-ink-900">{filteredExpenses.length}건</span> · 합계{' '}
            <span className="font-bold text-brand-700">
              {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('ko-KR')}원
            </span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => exportExpensesToExcel(filteredExpenses, '비용정산내역')}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brand-700"
            >
              <Download size={16} />
              엑셀 다운로드 (필터결과)
            </button>
            <button
              onClick={() => exportExpensesByVehicle(allExpenses, '차량별_정산내역')}
              className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
            >
              <FileSpreadsheet size={16} />
              차량별 시트로 전체 다운로드
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            불러오는 중...
          </div>
        ) : (
          <ExpenseTable expenses={filteredExpenses} onDelete={handleDelete} onUpdated={load} />
        )}
      </main>
    </div>
  );
}
