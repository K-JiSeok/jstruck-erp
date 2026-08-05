import { CATEGORY_COLORS } from '@/lib/types';

const FALLBACK_COLOR = 'bg-ink-100 text-ink-600';

export default function CategoryBadge({
  category,
  label,
}: {
  category: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        CATEGORY_COLORS[category] ?? FALLBACK_COLOR
      }`}
    >
      {label ?? category}
    </span>
  );
}
