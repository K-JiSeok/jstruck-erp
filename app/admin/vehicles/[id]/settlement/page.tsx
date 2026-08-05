'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, ShieldCheck, PlusCircle, Trash2, Printer } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import InlineEditableAmount from '@/components/InlineEditableAmount';
import InlineEditableText from '@/components/InlineEditableText';
import { EXPENSE_CATEGORIES, Employee, Expense, SettlementItem, Vehicle } from '@/lib/types';
import {
  addExpense,
  addSettlementItem,
  deleteSettlementItem,
  getVehicle,
  listEmployees,
  listExpenses,
  syncSettlementItems,
  updateExpense,
  updateSettlementItem,
  updateVehicle,
} from '@/lib/storage';
import { useRequireSession } from '@/lib/useSession';
import { formatWon } from '@/lib/format';

function employeeName(employees: Employee[], id: string | null) {
  if (!id) return '-';
  return employees.find((e) => e.id === id)?.name ?? '-';
}

function chunkItems<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export default function VehicleSettlementPage() {
  const session = useRequireSession();
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVehicle(vehicleId);
      if (!v) {
        setNotFound(true);
        return;
      }
      setVehicle(v);
      const [exp, emp] = await Promise.all([listExpenses({ vehicleId }), listEmployees()]);
      setEmployees(emp);
      setExpenses(exp);
      setItems(await syncSettlementItems(vehicleId, exp, v));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (!session) return null;

  const isAdminOrCeo = session.role === 'admin' || session.role === 'ceo';
  const isOwnPurchase = vehicle?.purchased_by === session.id;
  const allowed = isAdminOrCeo || isOwnPurchase;

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AdminNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-400">
          차량을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const expenseTotal = items.reduce((sum, i) => sum + i.amount, 0);
  const purchaseTotal = (vehicle?.purchase_price ?? 0) + expenseTotal;
  const profitTotal = (vehicle?.sale_price ?? 0) - purchaseTotal;

  const vendorsFor = (label: string) =>
    (EXPENSE_CATEGORIES as string[]).includes(label)
      ? expenses.filter((e) => e.category === label && e.vendor)
      : [];

  // 특정 정산 항목명과 실제로 연결된(같은 이름의) 등록 비용 내역을 찾는다.
  // - 등록화면 12개 항목명과 같으면: 그 카테고리로 등록된 내역
  // - 그 외(정산 전용 항목명)면: 카테고리가 '기타'이고 기타 내용이 이 항목명과 같은 내역
  const matchingExpensesFor = (label: string) =>
    (EXPENSE_CATEGORIES as string[]).includes(label)
      ? expenses.filter((e) => e.category === label)
      : expenses.filter((e) => e.category === '기타' && e.category_note === label);

  const repairSummaryLines = expenses
    .filter((e) => e.category === '차량정비')
    .map((e, i) => `수리${i + 1} - ${e.vendor || '업체명 미입력'} (${formatWon(e.amount)})`);

  async function saveVehicleField(field: keyof Vehicle, value: number | null) {
    if (!vehicle) return;
    const updated = await updateVehicle(vehicle.id, { [field]: value } as Partial<Vehicle>);
    setVehicle(updated);
  }

  async function handleItemAmountSave(item: SettlementItem, value: number | null) {
    const updated = await updateSettlementItem(item.id, { amount: value ?? 0 });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));

    // 수리/비용 내역에 아직 없는 항목이면 자동으로 등록해준다 (있으면 금액만 맞춰준다)
    if (!vehicle || !session) return;
    const matches = matchingExpensesFor(item.label);
    if (matches.length === 0) {
      if (value && value > 0) {
        const isKnownCategory = (EXPENSE_CATEGORIES as string[]).includes(item.label);
        const created = await addExpense({
          vehicle_id: vehicle.id,
          category: (isKnownCategory ? item.label : '기타') as any,
          category_note: isKnownCategory ? undefined : item.label,
          payment_method: '미결제',
          amount: value,
          vendor: '',
          description: '정산 화면에서 자동 등록됨',
          employee_id: session.id,
        });
        setExpenses((prev) => [created, ...prev]);
      }
    } else if (matches.length === 1 && value && value !== matches[0].amount) {
      // 이 항목과 1:1로 연결된 내역이 이미 있으면 금액을 맞춰준다 (여러 건이면 어떤 걸 바꿔야 할지
      // 알 수 없으니 건드리지 않는다)
      const updatedExpense = await updateExpense(matches[0].id, { amount: value });
      setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
    }
  }

  async function handleItemLabelSave(item: SettlementItem, label: string) {
    const updated = await updateSettlementItem(item.id, { label });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function handleAddItem() {
    if (!vehicle) return;
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const created = await addSettlementItem(vehicle.id, '새 항목', nextOrder);
    setItems((prev) => [...prev, created]);
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('이 항목을 삭제할까요?')) return;
    await deleteSettlementItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="min-h-screen bg-ink-50 print:bg-white">
      <div className="print:hidden">
        <AdminNav />
      </div>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 print:hidden">
        <button
          onClick={() => router.push(`/admin/vehicles/${vehicleId}`)}
          className="flex items-center gap-1 text-sm font-semibold text-ink-400 hover:text-ink-700"
        >
          <ArrowLeft size={16} />
          차량 상세로 돌아가기
        </button>

        {loading || !vehicle ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            불러오는 중...
          </div>
        ) : !allowed ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-white py-16 text-center">
            <Lock size={32} className="text-ink-300" />
            <p className="font-semibold text-ink-700">이 차량의 정산 내역을 볼 권한이 없습니다.</p>
            <p className="max-w-sm text-sm text-ink-400">
              정산 페이지는 관리자·대표이사, 또는 이 차량을 매입한 담당자만 확인할 수 있어요.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div>
                <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink-900">
                  {vehicle.plate_number} {vehicle.vehicle_type ?? ''}
                  <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    <ShieldCheck size={12} />
                    비공개
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm text-ink-500">
                  <p>매입자: {employeeName(employees, vehicle.purchased_by)}</p>
                  <p>판매자: {employeeName(employees, vehicle.sold_by)}</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50"
                >
                  <Printer size={15} />
                  인쇄
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="매입금액">
                <InlineEditableAmount
                  value={vehicle.purchase_price}
                  onSave={(v) => saveVehicleField('purchase_price', v)}
                />
              </SummaryCard>
              <SummaryCard label="매입계산서">
                <InlineEditableAmount
                  value={vehicle.purchase_amount}
                  onSave={(v) => saveVehicleField('purchase_amount', v)}
                />
              </SummaryCard>
              <SummaryCard label="판매금액" tone="emerald">
                <InlineEditableAmount
                  value={vehicle.sale_price}
                  onSave={(v) => saveVehicleField('sale_price', v)}
                />
              </SummaryCard>
              <SummaryCard label="매출계산서" tone="emerald">
                <InlineEditableAmount
                  value={vehicle.tax_invoice_amount}
                  onSave={(v) => saveVehicleField('tax_invoice_amount', v)}
                />
              </SummaryCard>
            </div>
            <p className="-mt-3 text-xs text-ink-400">
              위 금액을 수정하면 차량 상세페이지의 차량 정보에도 그대로 반영됩니다.
            </p>

            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-base font-bold text-ink-900">지출 내역</h2>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                >
                  <PlusCircle size={13} />
                  항목 추가
                </button>
              </div>
              <p className="mb-4 text-xs text-ink-400">
                항목명과 금액을 클릭하면 그 자리에서 바로 입력·수정됩니다. 등록 화면에서 입력한
                내역은 자동으로 채워지고 업체명이 밑에 작게 표시돼요. 상사비·세금·실내크리닝은
                처음엔 자동 계산된 금액으로 채워지며, 다른 항목처럼 자유롭게 수정할 수 있어요.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const vendors = vendorsFor(item.label);
                  return (
                    <div
                      key={item.id}
                      className="group flex min-h-[56px] flex-col justify-start gap-1 rounded-lg border border-ink-100 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <InlineEditableText
                          value={item.label}
                          onSave={(v) => handleItemLabelSave(item, v)}
                          className="flex-1 text-sm text-ink-600"
                        />
                        <InlineEditableAmount
                          value={item.amount || null}
                          onSave={(v) => handleItemAmountSave(item, v)}
                          className="text-sm font-semibold text-ink-800"
                        />
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded p-1 text-ink-200 opacity-0 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {vendors.length > 0 && (
                        <div className="pl-1 text-[11px] leading-tight text-ink-400">
                          {vendors.map((v) => (
                            <p key={v.id} className="truncate">
                              {v.vendor}
                              {v.description ? ` · ${v.description}` : ''} ·{' '}
                              {v.amount.toLocaleString('ko-KR')}원
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-sm font-bold text-ink-700">지출합계</span>
                <span className="text-base font-bold text-ink-900">{formatWon(expenseTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
                <p className="text-xs font-semibold text-ink-400">매입합계 (매입금액+지출합계)</p>
                <p className="mt-1 text-xl font-bold text-ink-900">{formatWon(purchaseTotal)}</p>
              </div>
              <div
                className={`rounded-2xl p-5 shadow-card ${
                  profitTotal >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                <p className="text-xs font-semibold text-white/80">이익금총계 (판매금액-매입합계)</p>
                <p className="mt-1 text-xl font-bold">{formatWon(profitTotal)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-500 shadow-card">
              <p className="mb-1 font-semibold text-ink-700">참고 (위 계산에는 포함되지 않음)</p>
              <p>광고판매가: {formatWon(vehicle.ad_amount)}</p>
              <p>딜러입금가: {formatWon(vehicle.dealer_deposit_amount)}</p>
              <p>계약금: {formatWon(vehicle.contract_deposit_amount)}</p>
            </div>
          </>
        )}
      </main>

      {vehicle && allowed && (
        <div className="hidden print:block print-sheet">
          <h1 className="border-2 border-black py-2.5 text-center text-xl font-bold">
            {vehicle.plate_number}
          </h1>
          <table className="w-full table-fixed border-collapse border border-black text-sm">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '32%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">차량명</td>
                <td className="border border-black px-3 py-2.5">{vehicle.vehicle_type ?? '-'}</td>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">차량번호</td>
                <td className="border border-black px-3 py-2.5">{vehicle.plate_number}</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">매입자</td>
                <td className="border border-black px-3 py-2.5">
                  {employeeName(employees, vehicle.purchased_by)}
                </td>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">판매자</td>
                <td className="border border-black px-3 py-2.5">
                  {employeeName(employees, vehicle.sold_by)}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">매입금액</td>
                <td className="border border-black px-3 py-2.5 text-right">
                  {formatWon(vehicle.purchase_price)}
                </td>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">판매금액</td>
                <td className="border border-black px-3 py-2.5 text-right">
                  {formatWon(vehicle.sale_price)}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">매입계산서</td>
                <td className="border border-black px-3 py-2.5 text-right">
                  {formatWon(vehicle.purchase_amount)}
                </td>
                <td className="border border-black bg-gray-100 px-3 py-2.5 font-semibold">매출계산서</td>
                <td className="border border-black px-3 py-2.5 text-right">
                  {formatWon(vehicle.tax_invoice_amount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="border border-t-0 border-black bg-gray-200 py-1.5 text-center text-sm font-bold">
            지출 내역
          </div>
          <table className="w-full table-fixed border-collapse border border-t-0 border-black text-sm">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <tbody>
              {chunkItems(items, 3).map((row, i) => (
                <tr key={i}>
                  {row.map((item) => (
                    <React.Fragment key={item.id}>
                      <td className="border border-black bg-gray-100 px-2.5 py-2 font-medium">
                        {item.label}
                      </td>
                      <td className="border border-black px-2.5 py-2 text-right">
                        {item.amount ? formatWon(item.amount) : '-'}
                      </td>
                    </React.Fragment>
                  ))}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, i2) => (
                      <React.Fragment key={`pad-${i2}`}>
                        <td className="border border-black bg-gray-100 px-2.5 py-2" />
                        <td className="border border-black px-2.5 py-2" />
                      </React.Fragment>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>

          {repairSummaryLines.length > 0 && (
            <table className="w-full table-fixed border-collapse border border-t-0 border-black text-sm">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '82%' }} />
              </colgroup>
              <tbody>
                {repairSummaryLines.map((line, i) => (
                  <tr key={i}>
                    <td className="border border-black bg-gray-100 px-3 py-2 font-semibold">
                      수리내용({i + 1})
                    </td>
                    <td className="border border-black px-3 py-2">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <table className="w-full table-fixed border-collapse border border-t-0 border-black text-sm">
            <colgroup>
              <col style={{ width: '33.33%' }} />
              <col style={{ width: '33.33%' }} />
              <col style={{ width: '33.34%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">
                  지출합계
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">
                  매입합계
                </td>
                <td className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">
                  이익금총계
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-2.5 text-center text-base">
                  {formatWon(expenseTotal)}
                </td>
                <td className="border border-black px-2 py-2.5 text-center text-base">
                  {formatWon(purchaseTotal)}
                </td>
                <td className="border border-black px-2 py-2.5 text-center text-base font-bold">
                  {formatWon(profitTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 12mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-sheet {
                width: 100%;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  children,
  tone = 'default',
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'emerald';
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${
        tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-ink-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold text-ink-400">{label}</p>
      <div className={`mt-1 text-lg font-bold ${tone === 'emerald' ? 'text-emerald-700' : 'text-ink-900'}`}>
        {children}
      </div>
    </div>
  );
}
