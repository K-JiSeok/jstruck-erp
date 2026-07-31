'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { addVehicle, listEmployees } from '@/lib/storage';
import { Employee, Vehicle } from '@/lib/types';
import { Session } from '@/lib/session';
import { isBusinessPlateNumber } from '@/lib/format';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function VehicleForm({
  onCreated,
  session,
}: {
  onCreated: (v: Vehicle) => void;
  session: Session;
}) {
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [date, setDate] = useState(todayStr());
  const [purchasedBy, setPurchasedBy] = useState(session.id);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBusiness = useMemo(() => isBusinessPlateNumber(plateNumber), [plateNumber]);

  useEffect(() => {
    listEmployees().then(setEmployees).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plateNumber.trim()) {
      setError('차량번호를 입력해주세요.');
      return;
    }
    if (!vehicleType.trim()) {
      setError('차종을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const vehicle = await addVehicle({
        plate_number: plateNumber.trim(),
        vehicle_type: vehicleType.trim(),
        registration_type: isBusiness ? 'business' : 'private',
        inbound_date: isBusiness ? date : undefined,
        transfer_date: isBusiness ? undefined : date,
        purchased_by: purchasedBy || undefined,
      });
      onCreated(vehicle);
      setPlateNumber('');
      setVehicleType('');
      setDate(todayStr());
    } catch {
      setError('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:flex sm:flex-wrap sm:items-end"
    >
      <div className="sm:w-40">
        <label className="mb-1 block text-xs font-semibold text-ink-400">차량번호</label>
        <input
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          placeholder="예: 84라1234"
          lang="ko"
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <p
          className={`mt-1 text-[11px] font-medium text-ink-400 ${
            plateNumber.trim() ? '' : 'invisible'
          }`}
        >
          {isBusiness ? '영업용 번호로 인식됨' : '자가용 번호로 인식됨'}
        </p>
      </div>
      <div className="sm:w-40">
        <label className="mb-1 block text-xs font-semibold text-ink-400">차종</label>
        <input
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          placeholder="예: 5톤 카고"
          lang="ko"
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <p className="invisible mt-1 text-[11px] font-medium">-</p>
      </div>
      <div className="sm:w-auto">
        <label className="mb-1 block text-xs font-semibold text-ink-400">
          {isBusiness ? '입고일' : '이전일'}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <p className="invisible mt-1 text-[11px] font-medium">-</p>
      </div>
      <div className="sm:w-32">
        <label className="mb-1 block text-xs font-semibold text-ink-400">매입담당자</label>
        <select
          value={purchasedBy}
          onChange={(e) => setPurchasedBy(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <p className="invisible mt-1 text-[11px] font-medium">-</p>
      </div>
      <div>
        <p className="invisible mb-1 hidden text-xs font-semibold sm:block">-</p>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
          차량 등록
        </button>
        <p className="invisible mt-1 hidden text-[11px] font-medium sm:block">-</p>
      </div>
      {error && <p className="text-sm font-medium text-rose-600 sm:w-full">{error}</p>}
    </form>
  );
}
