'use client';

import { useState } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import {
  CARD_COMPANIES,
  CardCompany,
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
} from '@/lib/types';
import { deleteExpense, updateExpense } from '@/lib/storage';

function formatNumber(v: string) {
  const digits = v.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export default function EditExpenseModal({
  expense,
  onClose,
  onUpdated,
  onDeleted,
}: {
  expense: Expense;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted?: () => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [categoryNote, setCategoryNote] = useState(expense.category_note ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense.payment_method);
  const [cardCompany, setCardCompany] = useState<CardCompany | ''>(
    (expense.card_company as CardCompany) ?? ''
  );
  const [amount, setAmount] = useState(expense.amount.toLocaleString('ko-KR'));
  const [vendor, setVendor] = useState(expense.vendor);
  const [description, setDescription] = useState(expense.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const numeric = Number(amount.replace(/[^0-9]/g, ''));
    if (!numeric) {
      setError('결제 금액을 입력해주세요.');
      return;
    }
    if (!vendor.trim()) {
      setError('업체명을 입력해주세요.');
      return;
    }
    if (category === '기타' && !categoryNote.trim()) {
      setError("'기타' 항목의 내용을 입력해주세요.");
      return;
    }
    if (paymentMethod === '카드' && !cardCompany) {
      setError('카드사를 선택해주세요.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateExpense(expense.id, {
        category,
        category_note: category === '기타' ? categoryNote.trim() : null,
        payment_method: paymentMethod,
        card_company: paymentMethod === '카드' ? (cardCompany as CardCompany) : null,
        amount: numeric,
        vendor: vendor.trim(),
        description: description.trim() || null,
      });
      onUpdated();
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('이 내역을 삭제할까요?')) return;
    setSaving(true);
    try {
      await deleteExpense(expense.id);
      onDeleted?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-900">내역 수정</h3>
            <p className="mt-0.5 text-xs text-ink-400">
              {expense.vehicles?.plate_number ?? ''} ·{' '}
              {new Date(expense.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-300 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">비용 항목</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-lg border-2 py-2 text-xs font-semibold ${
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
                placeholder="기타 항목 내용"
                className="mt-2 w-full rounded-lg border-2 border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">결제 방법</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m);
                    if (m !== '카드') setCardCompany('');
                  }}
                  className={`rounded-lg border-2 py-2 text-xs font-semibold ${
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
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {CARD_COMPANIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardCompany(c)}
                    className={`rounded-lg border-2 py-1.5 text-xs font-semibold ${
                      cardCompany === c
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">결제 금액</label>
            <div className="relative">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatNumber(e.target.value))}
                className="w-full rounded-lg border-2 border-ink-200 px-3 py-2.5 pr-10 text-right text-base font-bold outline-none focus:border-brand-500"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                원
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">업체명</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-lg border-2 border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">수리내용</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-2 border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-rose-200 px-3 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-60"
          >
            <Trash2 size={15} />
            삭제
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
