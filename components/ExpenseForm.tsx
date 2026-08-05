'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Loader2, CheckCircle2, PlusCircle } from 'lucide-react';
import {
  CARD_COMPANIES,
  CardCompany,
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  Vehicle,
  Vendor,
} from '@/lib/types';
import {
  addExpense,
  listExpensesByEmployee,
  listVehicles,
  listVendors,
  uploadReceiptImage,
} from '@/lib/storage';
import { resizeImageFile } from '@/lib/image';
import { Session } from '@/lib/session';
import VehiclePicker from './VehiclePicker';
import VendorPicker from './VendorPicker';
import VoiceInputButton from './VoiceInputButton';
import RecentExpensesPanel from './RecentExpensesPanel';

function formatNumber(v: string) {
  const digits = v.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export default function ExpenseForm({ session }: { session: Session }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [categoryNote, setCategoryNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [cardCompany, setCardCompany] = useState<CardCompany | ''>('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadRecent() {
    listExpensesByEmployee(session.id)
      .then((list) => setRecentExpenses(list.slice(0, 50)))
      .catch(() => {});
  }

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listVehicles().then(setVehicles).catch(() => setError('차량 목록을 불러오지 못했습니다.'));
    listVendors().then(setVendors).catch(() => {});
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    setError('');
    try {
      const dataUrl = await resizeImageFile(file);
      setReceiptPreview(dataUrl);
    } catch {
      setError('영수증 사진을 처리하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setImageLoading(false);
    }
  }

  function resetForm() {
    setVehicleId('');
    setCategory('');
    setCategoryNote('');
    setPaymentMethod('');
    setCardCompany('');
    setAmount('');
    setVendor('');
    setDescription('');
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validate(): string {
    if (!vehicleId) return '차량번호를 선택해주세요.';
    if (!category) return '비용 항목을 선택해주세요.';
    if (category === '기타' && !categoryNote.trim()) return "'기타' 항목의 내용을 입력해주세요.";
    if (!paymentMethod) return '결제 방법을 선택해주세요.';
    if (paymentMethod === '카드' && !cardCompany) return '카드사를 선택해주세요.';
    const numeric = Number(amount.replace(/[^0-9]/g, ''));
    if (!numeric || numeric <= 0) return '결제 금액을 입력해주세요.';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      let receiptUrl: string | undefined;
      if (receiptPreview) {
        receiptUrl = await uploadReceiptImage(vehicleId, receiptPreview);
      }

      await addExpense({
        vehicle_id: vehicleId,
        category: category as ExpenseCategory,
        category_note: category === '기타' ? categoryNote.trim() : undefined,
        payment_method: paymentMethod as PaymentMethod,
        card_company: paymentMethod === '카드' ? (cardCompany as CardCompany) : undefined,
        amount: Number(amount.replace(/[^0-9]/g, '')),
        vendor: vendor.trim(),
        description: description.trim() || undefined,
        receipt_url: receiptUrl,
        employee_id: session.id,
      });

      setSubmitting(false);
      setSuccess(true);
      loadRecent();
    } catch {
      setError('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="worker-shell">
      {success ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-16 text-center">
          <CheckCircle2 size={64} className="text-brand-600" />
          <h2 className="text-2xl font-bold text-ink-900">등록 완료되었습니다</h2>
          <p className="text-ink-500">비용 내역이 저장되었습니다. 감사합니다!</p>
          <button
            onClick={() => {
              resetForm();
              setSuccess(false);
            }}
            className="mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-card active:bg-brand-700"
          >
            <PlusCircle size={22} />
            다음 건 등록하기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-8 pt-4">
          {/* 로그인된 등록자 표시 */}
          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-base font-bold text-brand-800">등록자: {session.name}</p>
          </div>

          {/* 차량 선택 */}
          <div>
            <label className="mb-2 block text-base font-bold text-ink-700">① 차량번호</label>
        <VehiclePicker
          vehicles={vehicles}
          value={vehicleId}
          onChange={setVehicleId}
          onVehicleCreated={(v) => setVehicles((prev) => [v, ...prev])}
        />
      </div>

      {/* 비용 항목 */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">② 비용 항목</label>
        <div className="grid grid-cols-3 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-xl border-2 py-3 text-center text-sm font-semibold transition-colors ${
                category === c
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {category === '기타' && (
          <input
            value={categoryNote}
            onChange={(e) => setCategoryNote(e.target.value)}
            placeholder="기타 항목 내용을 입력해주세요"
            lang="ko"
            className="mt-2 w-full rounded-xl border-2 border-ink-200 px-4 py-3 text-base outline-none focus:border-brand-500"
          />
        )}
      </div>

      {/* 결제 방법 */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">③ 결제 방법</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setPaymentMethod(m);
                if (m !== '카드') setCardCompany('');
              }}
              className={`rounded-xl border-2 py-3 text-center text-sm font-semibold transition-colors sm:text-base ${
                paymentMethod === m
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {paymentMethod === '카드' && (
          <div className="mt-2">
            <p className="mb-1.5 text-xs font-semibold text-ink-400">카드사를 선택해주세요</p>
            <div className="grid grid-cols-3 gap-2">
              {CARD_COMPANIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCardCompany(c)}
                  className={`rounded-xl border-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                    cardCompany === c
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 결제 금액 */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">④ 결제 금액</label>
        <div className="relative">
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatNumber(e.target.value))}
            placeholder="0"
            className="h-[60px] w-full rounded-xl border-2 border-ink-200 px-4 pr-12 text-right text-2xl font-bold outline-none focus:border-brand-500"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-ink-400">
            원
          </span>
        </div>
      </div>

      {/* 업체명 (자주 쓰는 업체 선택/등록 + 음성입력 가능) */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">⑤ 업체명 (선택)</label>
        <div className="flex items-stretch gap-2">
          <VendorPicker
            vendors={vendors}
            value={vendor}
            onChange={setVendor}
            onVendorCreated={(v) => setVendors((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)))}
          />
          <VoiceInputButton onResult={(text) => setVendor((prev) => (prev ? `${prev} ${text}` : text))} />
        </div>
      </div>

      {/* 수리내용 (음성입력 가능) */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">⑥ 수리내용</label>
        <div className="flex items-stretch gap-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="작업 내용을 입력하거나 마이크 버튼으로 말해주세요"
            rows={3}
            lang="ko"
            className="w-full rounded-xl border-2 border-ink-200 px-4 py-3 text-base outline-none focus:border-brand-500"
          />
          <VoiceInputButton
            onResult={(text) => setDescription((prev) => (prev ? `${prev} ${text}` : text))}
          />
        </div>
      </div>

      {/* 영수증 사진 */}
      <div>
        <label className="mb-2 block text-base font-bold text-ink-700">⑦ 영수증 사진</label>
        {receiptPreview ? (
          <div className="relative w-40">
            <img
              src={receiptPreview}
              alt="영수증 미리보기"
              className="h-40 w-40 rounded-xl border-2 border-ink-200 object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setReceiptPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute -right-2 -top-2 rounded-full bg-ink-800 p-1.5 text-white shadow"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageLoading}
            className="flex w-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 bg-white py-8 text-ink-400"
          >
            {imageLoading ? <Loader2 size={28} className="animate-spin" /> : <Camera size={28} />}
            <span className="text-sm font-semibold">
              {imageLoading ? '처리 중...' : '사진 촬영/첨부'}
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-base font-semibold text-rose-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="sticky bottom-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-5 text-xl font-bold text-white shadow-lg shadow-brand-900/20 active:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={24} className="animate-spin" /> : '등록하기'}
      </button>
        </form>
      )}

      <div className="border-t border-ink-100">
        <RecentExpensesPanel expenses={recentExpenses} onChanged={loadRecent} />
      </div>
    </div>
  );
}
