import { Employee } from './types';

const SESSION_KEY = 'truck_mvp_session_v1';

export interface Session {
  id: string;
  name: string;
  role: 'staff' | 'admin' | 'ceo';
}

export function saveSession(employee: Employee) {
  if (typeof window === 'undefined') return;
  const session: Session = { id: employee.id, name: employee.name, role: employee.role };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}
