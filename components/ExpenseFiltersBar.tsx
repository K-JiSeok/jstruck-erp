'use client';

import { RotateCcw } from 'lucide-react';
import { EXPENSE_CATEGORIES, ExpenseCategory, ExpenseFilters, Vehicle } from '@/lib/types';

export default function ExpenseFiltersBar({
  vehicles,
  filters,
  onChange,
}: {
  vehicles: Vehicle[];
  filters: ExpenseFilters;
  onChange: (f: ExpenseFilters) => void;
}) {
  const hasActiveFilter =
    filters.vehicleId || filters.category || filters.startDate || filters.endDate;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink-400">차량번호</label>
        <select
          value={filters.vehicleId ?? ''}
          onChange={(e) => onChange({ ...filters, vehicleId: e.target.value || undefined })}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 outline-none focus:border-brand-500"
        >
          <option value="">전체 차량</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate_number}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink-400">비용 항목</label>
        <select
          value={filters.category ?? ''}
          onChange={(e) =>
            onChange({ ...filters, category: (e.target.value as ExpenseCategory) || undefined })
          }
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 outline-none focus:border-brand-500"
        >
          <option value="">전체 항목</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink-400">시작일</label>
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink-400">종료일</label>
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 outline-none focus:border-brand-500"
        />
      </div>

      {hasActiveFilter && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
        >
          <RotateCcw size={14} />
          필터 초기화
        </button>
      )}
    </div>
  );
}
