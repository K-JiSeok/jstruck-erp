'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface AmountField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'number' | 'select' | 'text' | 'date' | 'checkbox';
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export default function AmountInputModal({
  title,
  description,
  fields,
  confirmLabel = '확인',
  confirmTone = 'brand',
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  fields: AmountField[];
  confirmLabel?: string;
  confirmTone?: 'brand' | 'emerald' | 'rose';
  onConfirm: (values: Record<string, string>) => Promise<void> | void;
  onClose: () => void;
}) {
  const initial: Record<string, string> = {};
  fields.forEach((f) => {
    if (f.defaultValue) initial[f.key] = f.defaultValue;
  });
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function formatNumber(v: string) {
    const digits = v.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ko-KR');
  }

  async function handleConfirm() {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(f.type === 'checkbox' ? `${f.label}을(를) 체크해주세요.` : `${f.label}을(를) 입력해주세요.`);
        return;
      }
    }
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(values);
    } finally {
      setSubmitting(false);
    }
  }

  const toneClass = {
    brand: 'bg-brand-600 hover:bg-brand-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
  }[confirmTone];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-300 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((f) =>
            f.type === 'select' ? (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-ink-400">{f.label}</label>
                <select
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border-2 border-ink-200 px-3 py-3 text-base outline-none focus:border-brand-500"
                >
                  <option value="">선택 안 함</option>
                  {(f.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : f.type === 'text' ? (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-ink-400">{f.label}</label>
                <input
                  autoFocus={fields[0].key === f.key}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  lang="ko"
                  className="w-full rounded-xl border-2 border-ink-200 px-4 py-3 text-base outline-none focus:border-brand-500"
                />
              </div>
            ) : f.type === 'date' ? (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-ink-400">{f.label}</label>
                <input
                  type="date"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border-2 border-ink-200 px-4 py-3 text-base outline-none focus:border-brand-500"
                />
              </div>
            ) : f.type === 'checkbox' ? (
              <label
                key={f.key}
                className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              >
                <input
                  type="checkbox"
                  checked={values[f.key] === 'true'}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.key]: e.target.checked ? 'true' : '' }))
                  }
                  className="h-4 w-4"
                />
                {f.label}
              </label>
            ) : (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-ink-400">{f.label}</label>
                <div className="relative">
                  <input
                    autoFocus={fields[0].key === f.key}
                    inputMode="numeric"
                    value={values[f.key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.key]: formatNumber(e.target.value) }))
                    }
                    placeholder={f.placeholder ?? '0'}
                    className="w-full rounded-xl border-2 border-ink-200 px-4 py-3 pr-10 text-right text-lg font-bold outline-none focus:border-brand-500"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
                    원
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-ink-200 py-3 text-sm font-semibold text-ink-600 hover:bg-ink-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 ${toneClass}`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
