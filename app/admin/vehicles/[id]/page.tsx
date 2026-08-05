'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Loader2,
  BadgeCheck,
  XCircle,
  Pencil,
  ArrowRightLeft,
  Calculator,
} from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import FileUploadSection from '@/components/FileUploadSection';
import ExpenseTable from '@/components/ExpenseTable';
import AmountInputModal from '@/components/AmountInputModal';
import { Employee, Expense, Vehicle, VehicleFile, VEHICLE_STATUS_LABEL } from '@/lib/types';
import {
  addNotification,
  cancelContract,
  cancelSale,
  confirmPerformanceCheck,
  convertToPrivate,
  deleteExpense,
  getVehicle,
  listEmployees,
  listExpenses,
  listVehicleFiles,
  markVehicleContracted,
  markVehicleSold,
  updateVehicle,
} from '@/lib/storage';
import { useRequireSession } from '@/lib/useSession';
import { formatEokMan, formatWon, isBusinessPlateNumber, manToWon, vehicleDisplayDate, wonToManInput } from '@/lib/format';

export default function VehicleDetailPage() {
  const session = useRequireSession();
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [files, setFiles] = useState<VehicleFile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<'contract' | 'sold' | 'renamePlate' | 'convertPrivate' | null>(
    null
  );

  // 차량 정보(정산) 편집 상태
  const [editingFinancials, setEditingFinancials] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(''); // 원 단위
  const [purchaseAmount, setPurchaseAmount] = useState(''); // 원 단위
  const [adAmountMan, setAdAmountMan] = useState(''); // 만원 단위 입력
  const [dealerDepositMan, setDealerDepositMan] = useState(''); // 만원 단위 입력

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVehicle(vehicleId);
      if (!v) {
        setNotFound(true);
        return;
      }
      setVehicle(v);
      setPurchasePrice(v.purchase_price ? v.purchase_price.toLocaleString('ko-KR') : '');
      setPurchaseAmount(v.purchase_amount ? v.purchase_amount.toLocaleString('ko-KR') : '');
      setAdAmountMan(v.ad_amount ? Number(wonToManInput(v.ad_amount)).toLocaleString('ko-KR') : '');
      setDealerDepositMan(
        v.dealer_deposit_amount
          ? Number(wonToManInput(v.dealer_deposit_amount)).toLocaleString('ko-KR')
          : ''
      );
      // 값이 하나도 없으면 처음부터 입력 모드로 보여준다
      const hasAny = v.purchase_price || v.purchase_amount || v.ad_amount || v.dealer_deposit_amount;
      setEditingFinancials(!hasAny);

      const [f, e, emp] = await Promise.all([
        listVehicleFiles(vehicleId),
        listExpenses({ vehicleId }),
        listEmployees(),
      ]);
      setFiles(f);
      setExpenses(e);
      setEmployees(emp);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  function formatNumber(v: string) {
    const digits = v.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ko-KR');
  }

  async function handleSaveFinancials() {
    if (!vehicle) return;
    setSaving(true);
    try {
      const updated = await updateVehicle(vehicle.id, {
        purchase_price: purchasePrice ? Number(purchasePrice.replace(/[^0-9]/g, '')) : null,
        purchase_amount: purchaseAmount ? Number(purchaseAmount.replace(/[^0-9]/g, '')) : null,
        ad_amount: adAmountMan ? manToWon(adAmountMan) : null,
        dealer_deposit_amount: dealerDepositMan ? manToWon(dealerDepositMan) : null,
      });
      setVehicle(updated);
      setEditingFinancials(false);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPerformanceCheck() {
    if (!vehicle || !session) return;
    if (!confirm('성능점검기록부 내용을 최종 확인하셨습니까?')) return;
    await confirmPerformanceCheck(vehicle.id, session.id);
    await load();
  }

  async function handleContractConfirm(values: Record<string, string>) {
    if (!vehicle) return;
    const deposit = values.deposit ? Number(values.deposit.replace(/[^0-9]/g, '')) : null;
    await markVehicleContracted(vehicle.id, deposit);
    await addNotification(
      `🚚 [계약완료] ${vehicle.plate_number} 차량 계약이 완료되었습니다.`,
      vehicle.id
    );
    setModal(null);
    await load();
  }

  async function handleCancelContract() {
    if (!vehicle) return;
    if (!confirm('계약을 취소하고 재고 상태로 되돌릴까요? (성능점검 확인 상태도 초기화됩니다)')) return;
    await cancelContract(vehicle.id);
    await load();
  }

  async function handleCancelSale() {
    if (!vehicle || !session) return;
    const canCancel =
      session.role === 'admin' || session.role === 'ceo' || vehicle.sold_by === session.id;
    if (!canCancel) {
      alert('판매완료한 직원, 관리자, 대표이사만 판매취소를 할 수 있습니다.');
      return;
    }
    if (
      !confirm(
        '판매를 취소하고 다시 판매 가능한 상태로 되돌릴까요? (판매금액/매출계산서/성능점검 확인 상태가 초기화됩니다)'
      )
    )
      return;
    await cancelSale(vehicle.id);
    await load();
  }

  async function handleSoldConfirm(values: Record<string, string>) {
    if (!vehicle || !session) return;
    const salePrice = values.salePrice ? Number(values.salePrice.replace(/[^0-9]/g, '')) : null;
    const taxInvoiceAmount = values.taxInvoiceAmount
      ? Number(values.taxInvoiceAmount.replace(/[^0-9]/g, ''))
      : null;
    const soldByEmployeeId = values.soldBy || session.id;
    try {
      // 모달 안에서 성능점검기록부 확인 체크박스를 체크했다면, 판매완료 처리 전에 먼저 확인 처리
      if (!vehicle.performance_check_confirmed && values.confirmPerformanceCheck === 'true') {
        await confirmPerformanceCheck(vehicle.id, session.id);
      }
      await markVehicleSold(vehicle.id, soldByEmployeeId, salePrice, taxInvoiceAmount, values.saleDate);
      setModal(null);
      await load();
    } catch (err: any) {
      alert(err?.message ?? '처리에 실패했습니다.');
    }
  }

  async function handleRenamePlate(values: Record<string, string>) {
    if (!vehicle) return;
    const newPlate = values.plateNumber?.trim();
    if (!newPlate) return;
    await updateVehicle(vehicle.id, { plate_number: newPlate });
    setModal(null);
    await load();
  }

  async function handleConvertPrivate(values: Record<string, string>) {
    if (!vehicle) return;
    const newPlate = values.plateNumber?.trim();
    const transferDate = values.transferDate;
    if (!newPlate || !transferDate) {
      alert('새 차량번호와 이전일을 모두 입력해주세요.');
      return;
    }
    await convertToPrivate(vehicle.id, newPlate, transferDate);
    setModal(null);
    await load();
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense(id);
    load();
  }

  if (!session) return null;

  const canCancelSale = vehicle
    ? session.role === 'admin' || session.role === 'ceo' || vehicle.sold_by === session.id
    : false;

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AdminNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-400">
          차량을 찾을 수 없습니다.
          <div className="mt-4">
            <Link href="/admin/vehicles" className="text-brand-600 hover:underline">
              차량 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/vehicles')}
            className="flex items-center gap-1 text-sm font-semibold text-ink-400 hover:text-ink-700"
          >
            <ArrowLeft size={16} />
            차량 목록
          </button>
          {vehicle &&
            (session.role === 'admin' ||
              session.role === 'ceo' ||
              vehicle.purchased_by === session.id) && (
              <Link
                href={`/admin/vehicles/${vehicle.id}/settlement`}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                <Calculator size={15} />
                정산 보기
              </Link>
            )}
        </div>

        {loading || !vehicle ? (
          <div className="rounded-2xl border border-ink-200 bg-white py-16 text-center text-ink-400">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-ink-900">{vehicle.plate_number}</h1>
                  <button
                    onClick={() => setModal('renamePlate')}
                    className="rounded-lg p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-600"
                    title="차량번호 변경"
                  >
                    <Pencil size={15} />
                  </button>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
                    {isBusinessPlateNumber(vehicle.plate_number) ? '영업용' : '자가용'}
                  </span>
                </div>
                <p className="text-sm text-ink-400">
                  {vehicle.vehicle_type ?? '차종 미입력'} · {vehicleDisplayDate(vehicle).label}{' '}
                  {vehicleDisplayDate(vehicle).value ?? '-'}
                  {vehicle.status === 'sold' && vehicle.sold_at && (
                    <> · 판매일 {vehicle.sold_at.slice(0, 10)}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isBusinessPlateNumber(vehicle.plate_number) && (
                  <button
                    onClick={() => setModal('convertPrivate')}
                    className="flex items-center gap-1 rounded-lg border-2 border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    <ArrowRightLeft size={15} />
                    자가용으로 이전
                  </button>
                )}
                {vehicle.status === 'contracted' && (
                  <button
                    onClick={handleCancelContract}
                    className="group rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700 hover:bg-rose-100 hover:text-rose-600"
                    title="눌러서 계약취소"
                  >
                    <span className="group-hover:hidden">계약완료</span>
                    <span className="hidden items-center gap-1 group-hover:flex">
                      <XCircle size={14} />
                      취소
                    </span>
                  </button>
                )}
                {vehicle.status === 'sold' &&
                  (canCancelSale ? (
                    <button
                      onClick={handleCancelSale}
                      className="group rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 hover:bg-rose-100 hover:text-rose-600"
                      title="눌러서 판매취소"
                    >
                      <span className="group-hover:hidden">판매완료</span>
                      <span className="hidden items-center gap-1 group-hover:flex">
                        <XCircle size={14} />
                        취소
                      </span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
                      판매완료
                    </span>
                  ))}
                {vehicle.status === 'in_stock' && (
                  <button
                    onClick={() => setModal('contract')}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    계약완료로 변경
                  </button>
                )}
                {vehicle.status === 'contracted' && (
                  <button
                    onClick={() => setModal('sold')}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    판매완료 처리
                  </button>
                )}
              </div>
            </div>

            {/* 계약금 / 판매 정보 요약 (있을 때만 표시) */}
            {(vehicle.contract_deposit_amount || vehicle.sale_price || vehicle.tax_invoice_amount) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {vehicle.contract_deposit_amount ? (
                  <SummaryCard label="계약금" value={formatWon(vehicle.contract_deposit_amount)} />
                ) : null}
                {vehicle.sale_price ? (
                  <SummaryCard label="최종 판매금액" value={formatWon(vehicle.sale_price)} />
                ) : null}
                {vehicle.tax_invoice_amount ? (
                  <SummaryCard label="매출계산서" value={formatWon(vehicle.tax_invoice_amount)} />
                ) : null}
              </div>
            )}

            {/* 성능점검기록부 확인 알림 */}
            {vehicle.status !== 'sold' && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4 ${
                  vehicle.performance_check_confirmed
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {vehicle.performance_check_confirmed ? (
                    <BadgeCheck size={18} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-600" />
                  )}
                  <p className="text-sm font-semibold text-ink-700">
                    {vehicle.performance_check_confirmed
                      ? '성능점검기록부 최종 확인 완료 — 판매완료 처리가 가능합니다.'
                      : '판매완료 처리 전, 성능점검기록부를 최종 확인해주세요.'}
                  </p>
                </div>
                {!vehicle.performance_check_confirmed && (
                  <button
                    onClick={handleConfirmPerformanceCheck}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-card hover:bg-amber-100"
                  >
                    최종 확인하기
                  </button>
                )}
              </div>
            )}

            {/* 사진 / 서류 */}
            <div className="grid grid-cols-1 gap-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:grid-cols-2">
              <FileUploadSection
                vehicleId={vehicle.id}
                fileType="photo"
                files={files.filter((f) => f.file_type === 'photo')}
                uploadedBy={session.id}
                onChanged={load}
                accept="image/*"
                gridPreview
              />
              <FileUploadSection
                vehicleId={vehicle.id}
                fileType="registration"
                files={files.filter((f) => f.file_type === 'registration')}
                uploadedBy={session.id}
                onChanged={load}
                gridPreview
                fillHeight
              />
              <FileUploadSection
                vehicleId={vehicle.id}
                fileType="repair_report"
                files={files.filter((f) => f.file_type === 'repair_report')}
                uploadedBy={session.id}
                onChanged={load}
              />
              <FileUploadSection
                vehicleId={vehicle.id}
                fileType="performance_check"
                files={files.filter((f) => f.file_type === 'performance_check')}
                uploadedBy={session.id}
                onChanged={load}
              />
            </div>

            {/* 차량 정보 (정산) */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-ink-900">차량 정보</h2>
                {!editingFinancials && (
                  <button
                    onClick={() => setEditingFinancials(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                )}
              </div>

              {editingFinancials ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="매입가 (원)">
                      <input
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(formatNumber(e.target.value))}
                        inputMode="numeric"
                        placeholder="예: 5,000,000"
                        className="input"
                      />
                    </Field>
                    <Field label="매입계산서 (원)">
                      <input
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(formatNumber(e.target.value))}
                        inputMode="numeric"
                        placeholder="예: 5,000,000"
                        className="input"
                      />
                    </Field>
                    <Field label="광고판매가 (만원 단위)">
                      <input
                        value={adAmountMan}
                        onChange={(e) => setAdAmountMan(formatNumber(e.target.value))}
                        inputMode="numeric"
                        placeholder="예: 15000 → 1억5천만원"
                        className="input"
                      />
                    </Field>
                    <Field label="딜러입금가 (만원 단위)">
                      <input
                        value={dealerDepositMan}
                        onChange={(e) => setDealerDepositMan(formatNumber(e.target.value))}
                        inputMode="numeric"
                        placeholder="예: 15000 → 1억5천만원"
                        className="input"
                      />
                    </Field>
                  </div>
                  <button
                    onClick={handleSaveFinancials}
                    disabled={saving}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    저장
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryCard label="매입가" value={formatWon(vehicle.purchase_price)} />
                  <SummaryCard label="매입계산서" value={formatWon(vehicle.purchase_amount)} />
                  <SummaryCard label="광고판매가" value={formatEokMan(vehicle.ad_amount)} />
                  <SummaryCard
                    label="딜러입금가"
                    value={formatEokMan(vehicle.dealer_deposit_amount)}
                  />
                </div>
              )}
            </div>

            {/* 수리내역(비용) */}
            <div>
              <h2 className="mb-3 text-base font-bold text-ink-900">수리/비용 내역</h2>
              <p className="mb-2 text-xs text-ink-400">항목을 클릭하면 바로 수정할 수 있어요.</p>
              <ExpenseTable expenses={expenses} onDelete={handleDeleteExpense} onUpdated={load} />
            </div>
          </>
        )}
      </main>

      {modal === 'contract' && (
        <AmountInputModal
          title="계약완료 처리"
          description="계약금을 입력해주세요 (없으면 비워두고 확인해도 됩니다)"
          fields={[{ key: 'deposit', label: '계약금' }]}
          confirmLabel="확인"
          confirmTone="brand"
          onConfirm={handleContractConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'sold' && vehicle && (
        <AmountInputModal
          title="판매완료 처리"
          description="판매일, 최종 판매금액, 매출계산서 금액, 판매 담당자를 입력해주세요"
          fields={[
            {
              key: 'saleDate',
              label: '판매일',
              type: 'date',
              required: true,
              defaultValue: new Date().toISOString().slice(0, 10),
            },
            { key: 'salePrice', label: '최종 판매금액', required: true },
            { key: 'taxInvoiceAmount', label: '매출계산서' },
            {
              key: 'soldBy',
              label: '판매 담당자',
              type: 'select',
              defaultValue: session?.id,
              options: employees.map((emp) => ({ value: emp.id, label: emp.name })),
            },
            ...(!vehicle.performance_check_confirmed
              ? [
                  {
                    key: 'confirmPerformanceCheck',
                    label: '성능점검기록부 내용을 확인했습니다',
                    type: 'checkbox' as const,
                    required: true,
                  },
                ]
              : []),
          ]}
          confirmLabel="판매완료 처리"
          confirmTone="emerald"
          onConfirm={handleSoldConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'renamePlate' && vehicle && (
        <AmountInputModal
          title="차량번호 변경"
          fields={[
            {
              key: 'plateNumber',
              label: '새 차량번호',
              type: 'text',
              required: true,
              defaultValue: vehicle.plate_number,
              placeholder: '예: 98무8134',
            },
          ]}
          confirmLabel="변경"
          confirmTone="brand"
          onConfirm={handleRenamePlate}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'convertPrivate' && vehicle && (
        <AmountInputModal
          title="영업용 → 자가용 이전"
          description="자가용으로 이전되며 변경되는 새 차량번호와 이전일을 입력해주세요"
          fields={[
            {
              key: 'plateNumber',
              label: '새 차량번호',
              type: 'text',
              required: true,
              placeholder: '예: 12가3456',
            },
            {
              key: 'transferDate',
              label: '이전일',
              type: 'date',
              required: true,
              defaultValue: new Date().toISOString().slice(0, 10),
            },
          ]}
          confirmLabel="이전 처리"
          confirmTone="brand"
          onConfirm={handleConvertPrivate}
          onClose={() => setModal(null)}
        />
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 2px solid #d5dade;
          border-radius: 0.5rem;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #5486c9;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-400">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold text-ink-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}
