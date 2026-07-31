'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Check, PlusCircle, Loader2 } from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { addVehicle } from '@/lib/storage';
import { isBusinessPlateNumber } from '@/lib/format';

export default function VehiclePicker({
  vehicles,
  value,
  onChange,
  onVehicleCreated,
}: {
  vehicles: Vehicle[];
  value: string;
  onChange: (vehicleId: string) => void;
  onVehicleCreated: (vehicle: Vehicle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = vehicles.find((v) => v.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const normalizedQuery = query.replace(/\s/g, '');
  const filtered = vehicles.filter(
    (v) =>
      v.plate_number.replace(/\s/g, '').includes(normalizedQuery) ||
      (v.vehicle_type ?? '').includes(query)
  );

  const exactMatchExists = vehicles.some(
    (v) => v.plate_number.replace(/\s/g, '') === normalizedQuery
  );

  async function handleCreate() {
    if (!query.trim()) return;
    setSubmitting(true);
    try {
      const plateNumber = query.trim();
      const business = isBusinessPlateNumber(plateNumber);
      const today = new Date().toISOString().slice(0, 10);
      const vehicle = await addVehicle({
        plate_number: plateNumber,
        vehicle_type: newType.trim() || undefined,
        registration_type: business ? 'business' : 'private',
        inbound_date: business ? today : undefined,
        transfer_date: business ? undefined : today,
      });
      onVehicleCreated(vehicle);
      onChange(vehicle.id);
      setOpen(false);
      setCreating(false);
      setQuery('');
      setNewType('');
    } catch {
      alert('차량 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-4 text-left text-lg font-semibold transition-colors ${
          selected
            ? 'border-brand-500 bg-brand-50 text-brand-800'
            : 'border-ink-200 bg-white text-ink-400'
        }`}
      >
        <span>{selected ? selected.plate_number : '차량번호를 입력/선택하세요'}</span>
        <ChevronDown size={22} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
            <Search size={18} className="text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCreating(false);
              }}
              placeholder="차량번호 입력 (예: 98무8134)"
              className="w-full py-2 text-base outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange(v.id);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-50"
              >
                <span>
                  <span className="text-base font-semibold text-ink-900">{v.plate_number}</span>
                  <span className="ml-2 text-sm text-ink-400">{v.vehicle_type}</span>
                </span>
                {v.id === value && <Check size={18} className="text-brand-600" />}
              </button>
            ))}

            {filtered.length === 0 && !query && (
              <p className="px-4 py-6 text-center text-sm text-ink-400">
                등록된 차량이 없습니다. 차량번호를 입력해 새로 등록해보세요.
              </p>
            )}

            {/* 검색 결과에 없고, 정확히 일치하는 차량도 없을 때 -> 새로 등록 옵션 노출 */}
            {query.trim() && !exactMatchExists && (
              <div className="border-t border-ink-100 p-3">
                {!creating ? (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-lg bg-brand-50 px-3 py-3 text-left text-sm font-semibold text-brand-700"
                  >
                    <PlusCircle size={18} />
                    &apos;{query.trim()}&apos; 차량이 목록에 없어요 — 새로 등록하기
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink-700">
                      새 차량 등록: {query.trim()}
                    </p>
                    <input
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      placeholder="차종 (예: 5톤 카고) - 선택입력"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleCreate}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      등록하고 선택하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
