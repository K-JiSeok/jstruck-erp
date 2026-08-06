'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageOff, ImageIcon, Trash2, Pencil } from 'lucide-react';
import { Expense } from '@/lib/types';
import { expenseCategoryLabel } from '@/lib/format';
import CategoryBadge from './CategoryBadge';
import ReceiptViewerModal from './ReceiptViewerModal';
import EditExpenseModal from './EditExpenseModal';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExpenseTable({
  expenses,
  onDelete,
  onUpdated,
}: {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onUpdated?: () => void;
}) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-ink-400">
        조건에 맞는 비용 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400">
              <th className="px-4 py-3">등록일시</th>
              <th className="px-4 py-3">차량번호</th>
              <th className="px-4 py-3">항목</th>
              <th className="px-4 py-3">결제방법</th>
              <th className="px-4 py-3 text-right">금액</th>
              <th className="px-4 py-3">업체명</th>
              <th className="px-4 py-3">등록자</th>
              <th className="px-4 py-3">수리내용</th>
              <th className="px-4 py-3 text-center">영수증</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr
                key={e.id}
                onClick={() => setEditing(e)}
                className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-brand-50/40"
                title="클릭해서 수정"
              >
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                  {formatDateTime(e.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/admin/vehicles/${e.vehicle_id}`}
                    onClick={(ev) => ev.stopPropagation()}
                    className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
                  >
                    {e.vehicles?.plate_number ?? '-'}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={e.category} label={expenseCategoryLabel(e)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                  {e.payment_method}
                  {e.payment_method === '카드' && e.card_company ? `(${e.card_company})` : ''}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink-900">
                  {e.amount.toLocaleString('ko-KR')}원
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-600">{e.vendor}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">{e.employees?.name ?? '-'}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-ink-400">
                  {e.description ?? '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {e.receipt_url ? (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setViewerSrc(e.receipt_url!);
                      }}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
                    >
                      <ImageIcon size={18} />
                    </button>
                  ) : (
                    <ImageOff size={18} className="mx-auto text-ink-200" />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEditing(e);
                      }}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink-300 hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (confirm('이 내역을 삭제할까요?')) onDelete(e.id);
                      }}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewerSrc && <ReceiptViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      {editing && (
        <EditExpenseModal
          expense={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => onUpdated?.()}
          onDeleted={() => onUpdated?.()}
        />
      )}
    </div>
  );
}
