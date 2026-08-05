'use client';

import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';

function formatNumber(v: string) {
  const digits = v.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export default function InlineEditableAmount({
  value,
  onSave,
  suffix = '원',
  placeholder = '-',
  className = '',
  compact = false,
}: {
  value: number | null;
  onSave: (newValue: number | null) => Promise<void> | void;
  suffix?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== null ? value.toLocaleString('ko-KR') : '');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value !== null ? value.toLocaleString('ko-KR') : '');
    setEditing(true);
  }

  async function commit() {
    const numeric = draft.trim() ? Number(draft.replace(/[^0-9]/g, '')) : null;
    setSaving(true);
    try {
      await onSave(numeric);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(formatNumber(e.target.value))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className={
            compact
              ? 'w-16 rounded-md border-2 border-brand-400 px-1 py-0.5 text-right text-xs font-bold outline-none'
              : 'w-28 rounded-lg border-2 border-brand-400 px-2 py-1 text-right text-sm font-bold outline-none'
          }
        />
        {saving && <Loader2 size={14} className="animate-spin text-ink-300" />}
      </span>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1 py-0.5 hover:bg-brand-50 ${className}`}
      >
        {value !== null && value !== undefined ? `${value.toLocaleString('ko-KR')}${suffix}` : placeholder}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 -m-1 hover:bg-brand-50 ${className}`}
    >
      <span>{value !== null && value !== undefined ? `${value.toLocaleString('ko-KR')}${suffix}` : placeholder}</span>
      <Pencil size={12} className="text-ink-300 opacity-0 group-hover:opacity-100" />
    </button>
  );
}
