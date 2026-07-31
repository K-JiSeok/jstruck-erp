import { LucideIcon } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'brand' | 'neutral' | 'warn';
}) {
  const toneClasses = {
    brand: 'bg-brand-600 text-white',
    neutral: 'bg-white text-ink-900 border border-ink-200',
    warn: 'bg-amber-500 text-white',
  }[tone];

  const isDark = tone !== 'neutral';

  return (
    <div className={`rounded-2xl p-5 shadow-card ${toneClasses}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-ink-500'}`}>
          {label}
        </span>
        <div
          className={`rounded-full p-2 ${
            isDark ? 'bg-white/15' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
