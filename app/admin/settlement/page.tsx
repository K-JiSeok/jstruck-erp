'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock, Printer } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import InlineEditableAmount from '@/components/InlineEditableAmount';
import InlineEditableText from '@/components/InlineEditableText';
import { Employee, SalesCommission, Vehicle } from '@/lib/types';
import {
  getMonthlyMemo,
  listEmployees,
  listSalesCommissions,
  listSettlementTotals,
  listSoldVehicles,
  saveMonthlyMemo,
  updateVehicle,
  upsertSalesCommission,
} from '@/lib/storage';
import { useRequireSession } from '@/lib/useSession';
import { formatWon } from '@/lib/format';

function monthKeyOf(v: Vehicle) {
  return (v.sold_at ?? v.created_at).slice(0, 7);
}
function sortKeyOf(v: Vehicle) {
  return v.sold_at ?? v.created_at;
}

type PrintTarget = 'sales' | 'commission' | null;

export default function MonthlySettlementPage() {
  const session = useRequireSession();
  const [allSold, setAllSold] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settlementTotals, setSettlementTotals] = useState<Map<string, number>>(new Map());
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>('');
  const [memo, setMemo] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [printTarget, setPrintTarget] = useState<PrintTarget>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sold, emp] = await Promise.all([listSoldVehicles(), listEmployees()]);
      setAllSold(sold);
      setEmployees(emp);
      const ids = sold.map((v) => v.id);
      const [totals, comm] = await Promise.all([
        listSettlementTotals(ids),
        listSalesCommissions(ids),
      ]);
      setSettlementTotals(totals);
      setCommissions(comm);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const availableMonths = useMemo(() => {
    const set = new Set(allSold.map(monthKeyOf));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allSold]);

  useEffect(() => {
    if (!month && availableMonths.length > 0) setMonth(availableMonths[0]);
  }, [availableMonths, month]);

  useEffect(() => {
    if (!month) return;
    getMonthlyMemo(month).then(setMemo).catch(() => setMemo(''));
  }, [month]);

  useEffect(() => {
    if (!printTarget) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintTarget(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [printTarget]);

  if (!session) return null;

  const isAdminOrCeo = session.role === 'admin' || session.role === 'ceo';

  if (!isAdminOrCeo) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AdminNav />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-white py-16">
            <Lock size={32} className="text-ink-300" />
            <p className="font-semibold text-ink-700">월정산 페이지는 관리자·대표이사만 볼 수 있습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  const monthVehicles = allSold
    .filter((v) => monthKeyOf(v) === month)
    .sort((a, b) => sortKeyOf(a).localeCompare(sortKeyOf(b)));
  const monthIndex = availableMonths.indexOf(month);

  const commissionEmployees = employees.filter((e) => e.role !== 'ceo');

  function commissionForMan(vehicleId: string, employeeId: string) {
    const won = commissions.find((c) => c.vehicle_id === vehicleId && c.employee_id === employeeId)?.amount;
    return won ? Math.round(won / 10_000) : null;
  }

  async function handleCommissionSave(vehicleId: string, employeeId: string, manValue: number | null) {
    const won = manValue ? manValue * 10_000 : 0;
    const updated = await upsertSalesCommission(vehicleId, employeeId, won);
    setCommissions((prev) => {
      const rest = prev.filter((c) => !(c.vehicle_id === vehicleId && c.employee_id === employeeId));
      return [...rest, updated];
    });
  }

  async function handleExtraAmountSave(
    vehicleId: string,
    field: 'extra_commission_1' | 'extra_commission_2',
    manValue: number | null
  ) {
    const won = manValue ? manValue * 10_000 : null;
    const updated = await updateVehicle(vehicleId, { [field]: won } as Partial<Vehicle>);
    setAllSold((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
  }

  async function handleMemoNoteSave(vehicleId: string, field: 'sales_memo_1' | 'sales_memo_2', value: string) {
    const updated = await updateVehicle(vehicleId, { [field]: value } as Partial<Vehicle>);
    setAllSold((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
  }

  async function handleMemoSave() {
    if (!month) return;
    setMemoSaving(true);
    try {
      await saveMonthlyMemo(month, memo);
    } finally {
      setMemoSaving(false);
    }
  }

  const rows = monthVehicles.map((v, i) => {
    const purchase = v.purchase_price ?? 0;
    const sale = v.sale_price ?? 0;
    const expense = settlementTotals.get(v.id) ?? 0;
    const profit = sale - (purchase + expense);
    return { no: i + 1, vehicle: v, purchase, sale, expense, profit };
  });

  const totalPurchase = rows.reduce((s, r) => s + r.purchase, 0);
  const totalSale = rows.reduce((s, r) => s + r.sale, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

  const commissionColumnTotals = commissionEmployees.map((emp) =>
    rows.reduce((s, r) => s + (commissionForMan(r.vehicle.id, emp.id) ?? 0), 0)
  );
  const extra1Total = rows.reduce((s, r) => s + Math.round((r.vehicle.extra_commission_1 ?? 0) / 10_000), 0);
  const extra2Total = rows.reduce((s, r) => s + Math.round((r.vehicle.extra_commission_2 ?? 0) / 10_000), 0);
  const commissionGrandTotal =
    commissionColumnTotals.reduce((s, v) => s + v, 0) + extra1Total + extra2Total;

  return (
    <div className="min-h-screen bg-ink-50 print:bg-white">
      <div className="print:hidden">
        <AdminNav />
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-900">월간리포트</h1>
          <p className="text-sm text-ink-400">
            판매완료된 차량을 판매일 기준으로 월별로 모아 확인합니다. (관리자·대표이사 전용)
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            불러오는 중...
          </div>
        ) : availableMonths.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            판매완료된 차량이 아직 없습니다.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4 rounded-2xl border border-ink-200 bg-white py-3 shadow-card">
              <button
                disabled={monthIndex >= availableMonths.length - 1}
                onClick={() => setMonth(availableMonths[monthIndex + 1])}
                className="rounded-lg p-2 text-ink-400 hover:bg-ink-50 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-lg font-bold text-ink-900">
                {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월
              </span>
              <button
                disabled={monthIndex <= 0}
                onClick={() => setMonth(availableMonths[monthIndex - 1])}
                className="rounded-lg p-2 text-ink-400 hover:bg-ink-50 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <h2 className="text-base font-bold text-ink-900">월별 판매 정산</h2>
                <button
                  onClick={() => setPrintTarget('sales')}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                >
                  <Printer size={14} />
                  인쇄
                </button>
              </div>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400">
                    <th className="whitespace-nowrap px-3 py-3">번호</th>
                    <th className="whitespace-nowrap px-3 py-3">판매일</th>
                    <th className="whitespace-nowrap px-3 py-3">판매차량</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right">매입가</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right">판매가</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right">지출금</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right">수익금</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.vehicle.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                      <td className="px-3 py-2.5 text-ink-400">{r.no}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                        {sortKeyOf(r.vehicle).slice(0, 10)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link
                          href={`/admin/vehicles/${r.vehicle.id}/settlement`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {r.vehicle.vehicle_type ?? r.vehicle.plate_number}
                        </Link>
                        <p className="text-xs text-ink-400">{r.vehicle.plate_number}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-700">
                        {formatWon(r.purchase)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-700">
                        {formatWon(r.sale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-700">
                        {formatWon(r.expense)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${
                          r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {formatWon(r.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-200 bg-ink-50 font-bold">
                    <td className="whitespace-nowrap px-3 py-3" colSpan={3}>
                      합계
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatWon(totalPurchase)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatWon(totalSale)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatWon(totalExpense)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-emerald-700">
                      {formatWon(totalProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="-mt-3 text-xs text-ink-400">
              지출금은 각 차량 정산페이지의 지출 내역 합계입니다. 정산페이지를 한 번도 열지 않은
              차량은 0으로 표시되니, 정확한 값을 보려면 해당 차량 정산페이지를 한 번 열어주세요.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <div>
                  <h2 className="text-base font-bold text-ink-900">직원별 판매수당</h2>
                  <p className="text-xs text-ink-400">
                    금액은 만원 단위입니다. 판매자에 해당하는 칸에는 &quot;판매&quot; 표시가 붙어요.
                  </p>
                </div>
                <button
                  onClick={() => setPrintTarget('commission')}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                >
                  <Printer size={14} />
                  인쇄
                </button>
              </div>
              <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: '240px' }} />
                  {commissionEmployees.map((emp) => (
                    <col key={emp.id} style={{ width: '80px' }} />
                  ))}
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400">
                    <th className="px-2 py-3">번호</th>
                    <th className="px-3 py-3">판매차량</th>
                    {commissionEmployees.map((emp) => (
                      <th key={emp.id} className="px-1 py-3 text-center">
                        <Link href={`/admin/employees/${emp.id}`} className="text-brand-700 hover:underline">
                          {emp.name}
                        </Link>
                      </th>
                    ))}
                    <th className="px-1 py-3 text-center">판매자추가</th>
                    <th className="px-1 py-3 text-center">판매자추가</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.vehicle.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                      <td className="px-2 py-2.5 text-ink-400">{r.no}</td>
                      <td
                        className="overflow-hidden truncate px-3 py-2.5 font-semibold text-ink-800"
                        title={r.vehicle.vehicle_type ?? undefined}
                      >
                        {r.vehicle.vehicle_type ?? r.vehicle.plate_number}
                      </td>
                      {commissionEmployees.map((emp) => {
                        const isSeller = r.vehicle.sold_by === emp.id;
                        return (
                          <td key={emp.id} className="px-0.5 py-1">
                            <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                              {isSeller && (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                                  판
                                </span>
                              )}
                              <InlineEditableAmount
                                value={commissionForMan(r.vehicle.id, emp.id)}
                                onSave={(v) => handleCommissionSave(r.vehicle.id, emp.id, v)}
                                suffix="만원"
                                compact
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-0.5 py-1">
                        <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                          <InlineEditableText
                            value={r.vehicle.sales_memo_1 ?? ''}
                            onSave={(v) => handleMemoNoteSave(r.vehicle.id, 'sales_memo_1', v)}
                            placeholder="이름"
                            className="max-w-[80px] shrink-0 truncate text-xs"
                            compact
                          />
                          <InlineEditableAmount
                            value={
                              r.vehicle.extra_commission_1
                                ? Math.round(r.vehicle.extra_commission_1 / 10_000)
                                : null
                            }
                            onSave={(v) => handleExtraAmountSave(r.vehicle.id, 'extra_commission_1', v)}
                            suffix="만원"
                            compact
                          />
                        </div>
                      </td>
                      <td className="px-0.5 py-1">
                        <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                          <InlineEditableText
                            value={r.vehicle.sales_memo_2 ?? ''}
                            onSave={(v) => handleMemoNoteSave(r.vehicle.id, 'sales_memo_2', v)}
                            placeholder="이름"
                            className="max-w-[80px] shrink-0 truncate text-xs"
                            compact
                          />
                          <InlineEditableAmount
                            value={
                              r.vehicle.extra_commission_2
                                ? Math.round(r.vehicle.extra_commission_2 / 10_000)
                                : null
                            }
                            onSave={(v) => handleExtraAmountSave(r.vehicle.id, 'extra_commission_2', v)}
                            suffix="만원"
                            compact
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-200 bg-ink-50 font-bold">
                    <td className="px-3 py-3" colSpan={2}>
                      합계
                    </td>
                    {commissionColumnTotals.map((total, i) => (
                      <td key={commissionEmployees[i].id} className="px-2 py-3 text-center">
                        {total ? `${total.toLocaleString('ko-KR')}만원` : '-'}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center">
                      {extra1Total ? `${extra1Total.toLocaleString('ko-KR')}만원` : '-'}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {extra2Total ? `${extra2Total.toLocaleString('ko-KR')}만원` : '-'}
                    </td>
                  </tr>
                  <tr className="bg-ink-50 text-xs font-semibold text-ink-500">
                    <td className="px-3 pb-3 text-right" colSpan={2 + commissionEmployees.length + 2}>
                      전체 합계 {commissionGrandTotal.toLocaleString('ko-KR')}만원
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="border-t border-ink-100 p-4">
                <label className="mb-1.5 block text-xs font-semibold text-ink-400">메모</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  onBlur={handleMemoSave}
                  placeholder="이 달 정산 관련 메모를 자유롭게 남겨주세요"
                  lang="ko"
                  rows={3}
                  className="w-full rounded-xl border-2 border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                {memoSaving && <p className="mt-1 text-xs text-ink-300">저장 중...</p>}
              </div>
            </div>
          </>
        )}
      </main>

      {printTarget === 'sales' && rows.length > 0 && (
        <div className="hidden print:block">
          <h1 className="border-2 border-black py-2.5 text-center text-xl font-bold">
            {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월 판매 정산
          </h1>
          <table className="mt-2 w-full table-fixed border-collapse border border-black text-sm">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-2">번호</th>
                <th className="border border-black bg-gray-100 px-2 py-2">판매일</th>
                <th className="border border-black bg-gray-100 px-2 py-2">판매차량</th>
                <th className="border border-black bg-gray-100 px-2 py-2">매입가</th>
                <th className="border border-black bg-gray-100 px-2 py-2">판매가</th>
                <th className="border border-black bg-gray-100 px-2 py-2">지출금</th>
                <th className="border border-black bg-gray-100 px-2 py-2">수익금</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vehicle.id}>
                  <td className="border border-black px-2 py-1.5 text-center">{r.no}</td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    {sortKeyOf(r.vehicle).slice(0, 10)}
                  </td>
                  <td className="border border-black px-2 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {r.vehicle.vehicle_type ?? r.vehicle.plate_number}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right">{formatWon(r.purchase)}</td>
                  <td className="border border-black px-2 py-1.5 text-right">{formatWon(r.sale)}</td>
                  <td className="border border-black px-2 py-1.5 text-right">{formatWon(r.expense)}</td>
                  <td className="border border-black px-2 py-1.5 text-right font-bold">
                    {formatWon(r.profit)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-black bg-gray-100 px-2 py-2" colSpan={3}>
                  합계
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-right">
                  {formatWon(totalPurchase)}
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-right">
                  {formatWon(totalSale)}
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-right">
                  {formatWon(totalExpense)}
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-right">
                  {formatWon(totalProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {printTarget === 'commission' && rows.length > 0 && (
        <div className="hidden print:block">
          <h1 className="border-2 border-black py-2.5 text-center text-xl font-bold">
            {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월 직원별 판매수당
          </h1>
          <table className="mt-2 w-full table-fixed border-collapse border border-black text-sm">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '17%' }} />
              {commissionEmployees.map((emp) => (
                <col
                  key={emp.id}
                  style={{ width: `${58 / (commissionEmployees.length + 2)}%` }}
                />
              ))}
              <col style={{ width: `${58 / (commissionEmployees.length + 2)}%` }} />
              <col style={{ width: `${58 / (commissionEmployees.length + 2)}%` }} />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-3">번호</th>
                <th className="border border-black bg-gray-100 px-2 py-3">판매차량</th>
                {commissionEmployees.map((emp) => (
                  <th key={emp.id} className="border border-black bg-gray-100 px-2 py-3">
                    {emp.name}
                  </th>
                ))}
                <th className="border border-black bg-gray-100 px-2 py-3">판매자추가</th>
                <th className="border border-black bg-gray-100 px-2 py-3">판매자추가</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const extra1Man = r.vehicle.extra_commission_1
                  ? Math.round(r.vehicle.extra_commission_1 / 10_000)
                  : null;
                const extra2Man = r.vehicle.extra_commission_2
                  ? Math.round(r.vehicle.extra_commission_2 / 10_000)
                  : null;
                return (
                  <tr key={r.vehicle.id}>
                    <td className="border border-black px-2 py-2.5 text-center">{r.no}</td>
                    <td className="border border-black px-2 py-2.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      {r.vehicle.vehicle_type ?? r.vehicle.plate_number}
                    </td>
                    {commissionEmployees.map((emp) => {
                      const man = commissionForMan(r.vehicle.id, emp.id);
                      const isSeller = r.vehicle.sold_by === emp.id;
                      return (
                        <td key={emp.id} className="border border-black px-2 py-2.5 text-center whitespace-nowrap">
                          {isSeller ? '(판)' : ''}
                          {man ? `${man.toLocaleString('ko-KR')}만원` : ''}
                        </td>
                      );
                    })}
                    <td className="border border-black px-2 py-2.5 text-center whitespace-nowrap">
                      {r.vehicle.sales_memo_1
                        ? `${r.vehicle.sales_memo_1} ${extra1Man ? `${extra1Man.toLocaleString('ko-KR')}만원` : ''}`
                        : ''}
                    </td>
                    <td className="border border-black px-2 py-2.5 text-center whitespace-nowrap">
                      {r.vehicle.sales_memo_2
                        ? `${r.vehicle.sales_memo_2} ${extra2Man ? `${extra2Man.toLocaleString('ko-KR')}만원` : ''}`
                        : ''}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td className="border border-black bg-gray-100 px-2 py-3" colSpan={2}>
                  합계
                </td>
                {commissionColumnTotals.map((total, i) => (
                  <td
                    key={commissionEmployees[i].id}
                    className="border border-black bg-gray-100 px-2 py-3 text-center"
                  >
                    {total ? `${total.toLocaleString('ko-KR')}만원` : '-'}
                  </td>
                ))}
                <td className="border border-black bg-gray-100 px-2 py-3 text-center">
                  {extra1Total ? `${extra1Total.toLocaleString('ko-KR')}만원` : '-'}
                </td>
                <td className="border border-black bg-gray-100 px-2 py-3 text-center">
                  {extra2Total ? `${extra2Total.toLocaleString('ko-KR')}만원` : '-'}
                </td>
              </tr>
              <tr>
                <td
                  className="border border-black bg-gray-100 px-2 py-2 text-right text-sm font-bold"
                  colSpan={2 + commissionEmployees.length + 2}
                >
                  전체 합계 {commissionGrandTotal.toLocaleString('ko-KR')}만원
                </td>
              </tr>
            </tbody>
          </table>

          {memo && (
            <div className="mt-2 border border-black p-2 text-sm">
              <span className="font-semibold">메모: </span>
              {memo}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
