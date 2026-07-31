import { ExpenseCategory, CATEGORY_COLORS } from '@/lib/types';

export default function CategoryBadge({
  category,
  label,
}: {
  category: ExpenseCategory;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_COLORS[category]}`}
    >
      {label ?? category}
    </span>
  );
}
