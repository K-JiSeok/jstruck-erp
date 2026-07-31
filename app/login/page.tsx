'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Delete, LogIn, ArrowLeft } from 'lucide-react';
import { Employee } from '@/lib/types';
import { listEmployees, verifyLogin } from '@/lib/storage';
import { getSession, saveSession } from '@/lib/session';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ink-50">
          <p className="text-ink-400">불러오는 중...</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/worker';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 이미 로그인되어 있으면 이름/PIN 입력 없이 바로 목적지로 이동
    const existing = getSession();
    if (existing) {
      router.replace(redirectTo);
      return;
    }
    listEmployees()
      .then(setEmployees)
      .catch(() => setError('직원 목록을 불러오지 못했습니다. 네트워크를 확인해주세요.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pressDigit(d: string) {
    if (pin.length >= 4) return;
    setError('');
    setPin((p) => p + d);
  }

  function backspace() {
    setError('');
    setPin((p) => p.slice(0, -1));
  }

  async function submitPin(fullPin: string) {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const employee = await verifyLogin(selected.name, fullPin);
      if (!employee) {
        setError('PIN 번호가 일치하지 않습니다.');
        setPin('');
        return;
      }
      saveSession(employee);
      router.push(redirectTo);
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (pin.length === 4 && selected) {
      submitPin(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <p className="text-ink-400">불러오는 중...</p>
      </div>
    );
  }

  // ---- 이름 선택 화면 ----
  if (!selected) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-ink-50 px-6 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-lg font-bold text-white">
            JS
          </div>
          <h1 className="text-xl font-bold text-ink-900">직원 로그인</h1>
          <p className="mt-1 text-sm text-ink-400">본인 이름을 선택해주세요</p>
        </div>

        {error && (
          <div className="mb-4 w-full max-w-sm rounded-xl bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelected(emp)}
              className="rounded-2xl border-2 border-ink-200 bg-white py-5 text-lg font-bold text-ink-800 shadow-card active:border-brand-500 active:bg-brand-50"
            >
              {emp.name}
            </button>
          ))}
        </div>

        {employees.length === 0 && !error && (
          <p className="mt-6 max-w-sm text-center text-sm text-ink-400">
            등록된 직원이 없습니다. 관리자에게 직원 등록을 요청해주세요.
            (관리자 화면 → 직원 관리)
          </p>
        )}
      </div>
    );
  }

  // ---- PIN 입력 화면 ----
  return (
    <div className="flex min-h-screen flex-col items-center bg-ink-50 px-6 py-12">
      <button
        onClick={() => {
          setSelected(null);
          setPin('');
          setError('');
        }}
        className="mb-4 flex items-center gap-1 self-start text-sm font-semibold text-ink-400"
      >
        <ArrowLeft size={16} />
        다시 선택
      </button>

      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-xl font-bold text-ink-900">{selected.name}님</h1>
        <p className="mt-1 text-sm text-ink-400">PIN 번호 4자리를 입력해주세요</p>
      </div>

      <div className="mb-8 flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              pin.length > i ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 w-full max-w-xs rounded-xl bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-600">
          {error}
        </div>
      )}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={submitting}
            onClick={() => pressDigit(d)}
            className="rounded-2xl border-2 border-ink-200 bg-white py-5 text-2xl font-bold text-ink-800 shadow-card active:border-brand-500 active:bg-brand-50 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={submitting}
          onClick={() => pressDigit('0')}
          className="rounded-2xl border-2 border-ink-200 bg-white py-5 text-2xl font-bold text-ink-800 shadow-card active:border-brand-500 active:bg-brand-50 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={backspace}
          className="flex items-center justify-center rounded-2xl border-2 border-ink-200 bg-white py-5 text-ink-500 shadow-card active:bg-ink-50 disabled:opacity-50"
        >
          <Delete size={22} />
        </button>
      </div>

      {submitting && (
        <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-600">
          <LogIn size={16} className="animate-pulse" />
          확인 중...
        </p>
      )}
    </div>
  );
}
