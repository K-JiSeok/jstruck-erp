'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, PlusCircle, Loader2, Star } from 'lucide-react';
import { Vendor } from '@/lib/types';
import { addVendor } from '@/lib/storage';

export default function VendorPicker({
  vendors,
  value,
  onChange,
  onVendorCreated,
}: {
  vendors: Vendor[];
  value: string;
  onChange: (name: string) => void;
  onVendorCreated: (vendor: Vendor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const trimmed = value.trim();
  const filtered = vendors.filter((v) => v.name.includes(trimmed));
  const exactMatchExists = vendors.some((v) => v.name === trimmed);

  async function handleRegister() {
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const vendor = await addVendor(trimmed);
      onVendorCreated(vendor);
      setOpen(false);
    } catch {
      alert('이미 등록된 업체이거나, 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="예: 아산정비공업사 (자주 쓰는 업체는 목록에서 선택)"
        lang="ko"
        className="w-full rounded-xl border-2 border-ink-200 px-4 py-4 text-lg outline-none focus:border-brand-500"
      />

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {vendors.length === 0 && (
              <p className="px-4 py-4 text-center text-sm text-ink-400">
                등록된 업체가 없습니다.
              </p>
            )}
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange(v.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-50"
              >
                <span className="flex items-center gap-2 text-base text-ink-800">
                  <Star size={14} className="text-amber-400" />
                  {v.name}
                </span>
                {v.name === trimmed && <Check size={18} className="text-brand-600" />}
              </button>
            ))}
          </div>

          {trimmed && !exactMatchExists && (
            <div className="border-t border-ink-100 p-3">
              <button
                type="button"
                disabled={submitting}
                onClick={handleRegister}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                &apos;{trimmed}&apos; 자주 쓰는 업체로 등록하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
