import React from 'react';
import { X } from 'lucide-react';

/**
 * Close icon for the top-right corner of a dialog card. The card must be a
 * positioning context (`relative`). `!mt-0` keeps `space-y-*` containers from
 * pushing this absolutely positioned button down.
 */
export default function ModalClose({ onClick, label = 'Close dialog' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title="Close"
      className="absolute top-3 right-3 !mt-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
