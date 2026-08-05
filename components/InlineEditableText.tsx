'use client';

import { useState } from 'react';

export default function InlineEditableText({
  value,
  onSave,
  className = '',
  placeholder = '',
  compact = false,
}: {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  async function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed !== value) {
      await onSave(trimmed);
    } else {
      setDraft(value);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        lang="ko"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={
          compact
            ? 'w-14 rounded-md border-2 border-brand-400 px-1 py-0.5 text-xs outline-none'
            : 'w-full rounded-lg border-2 border-brand-400 px-2 py-1 text-sm outline-none'
        }
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`rounded px-1 text-left hover:bg-ink-50 ${!value ? 'text-ink-300' : ''} ${className}`}
    >
      {value || placeholder || '\u00A0'}
    </button>
  );
}
