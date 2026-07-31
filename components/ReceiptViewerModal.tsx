'use client';

import { X } from 'lucide-react';

export default function ReceiptViewerModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt="영수증"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}
