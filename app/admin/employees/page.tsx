'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserPlus, ShieldCheck, Crown, ChevronRight } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import { Employee, EMPLOYEE_ROLE_LABEL, EmployeeRole } from '@/lib/types';
import { addEmployee, deactivateEmployee, listEmployees } from '@/lib/storage';

const ROLE_RANK: Record<EmployeeRole, number> = { ceo: 0, admin: 1, staff: 2 };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<EmployeeRole>('staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) => {
        const rankDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name, 'ko');
      }),
    [employees]
  );

  async function load() {
    setLoading(true);
    try {
      setEmployees(await listEmployees());
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN은 숫자 4자리로 입력해주세요.');
      return;
    }
    try {
      await addEmployee({ name: name.trim(), phone: phone.trim() || undefined, pin, role });
      setName('');
      setPhone('');
      setPin('');
      setRole('staff');
      await load();
    } catch (err: any) {
      setError(err?.message ?? '등록에 실패했습니다.');
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('이 직원을 비활성화(삭제)할까요? 등록된 비용/차량 이력은 유지됩니다.')) return;
    await deactivateEmployee(id);
    await load();
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-bold text-ink-900">직원 관리</h1>
          <p className="text-sm text-ink-400">
            직원 로그인용 이름과 PIN 번호(4자리)를 등록합니다.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-400">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김현수"
              className="w-32 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-400">연락처(선택)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-36 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-400">PIN (4자리)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="0000"
              className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm tracking-widest outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-400">권한</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="staff">직원</option>
              <option value="admin">관리자</option>
              <option value="ceo">대표이사</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <UserPlus size={16} />
            직원 등록
          </button>
          {error && <p className="w-full text-sm font-medium text-rose-600">{error}</p>}
        </form>

        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400">
                <th className="whitespace-nowrap px-4 py-3">이름</th>
                <th className="whitespace-nowrap px-4 py-3">연락처</th>
                <th className="whitespace-nowrap px-4 py-3">권한</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                    등록된 직원이 없습니다.
                  </td>
                </tr>
              )}
              {sortedEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-900">
                    <Link
                      href={`/admin/employees/${emp.id}`}
                      className="flex items-center gap-1 text-brand-700 hover:underline"
                    >
                      {emp.name}
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-500">{emp.phone ?? '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {emp.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        <ShieldCheck size={12} />
                        관리자
                      </span>
                    ) : emp.role === 'ceo' ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <Crown size={12} />
                        대표이사
                      </span>
                    ) : (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                        직원
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeactivate(emp.id)}
                      className="whitespace-nowrap text-xs font-semibold text-ink-400 hover:text-rose-500"
                    >
                      비활성화
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
