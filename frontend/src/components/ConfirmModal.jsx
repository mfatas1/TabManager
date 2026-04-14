import { useState } from 'react';
import { Trash2, FolderMinus } from 'lucide-react';

/**
 * Reusable confirm modal with optional "don't ask again" checkbox.
 *
 * Props:
 *   title          - heading text
 *   message        - body text
 *   confirmLabel   - text on the confirm button (default "Delete")
 *   confirmClass   - extra tailwind classes for confirm button (default red)
 *   icon           - 'trash' | 'remove'  (default 'trash')
 *   onConfirm(dontAskAgain) - called when user confirms
 *   onCancel       - called when user cancels / clicks backdrop
 */
export default function ConfirmModal({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  confirmClass = 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20',
  icon = 'trash',
  onConfirm,
  onCancel,
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-[#dfe5df] shadow-2xl shadow-black/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-400/60 via-red-400 to-red-400/60" />

        <div className="p-6">
          {/* Icon + heading */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 size-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              {icon === 'remove'
                ? <FolderMinus className="size-4.5 text-red-400" />
                : <Trash2 className="size-4.5 text-red-400" />
              }
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[#26312d] leading-tight mb-1">
                {title}
              </h2>
              {message && (
                <p className="text-sm text-[#7d8984] leading-relaxed">{message}</p>
              )}
            </div>
          </div>

          {/* Don't ask again */}
          <label className="flex items-center gap-2.5 py-3 px-3.5 rounded-lg bg-[#f7f8f5] border border-[#e8ece8] cursor-pointer group select-none mb-5">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="sr-only"
              />
              <div className={`size-4 rounded border-2 flex items-center justify-center transition-all ${
                dontAskAgain
                  ? 'bg-[#315f56] border-[#315f56]'
                  : 'bg-white border-[#c8d4cd] group-hover:border-[#8baea0]'
              }`}>
                {dontAskAgain && (
                  <svg className="size-2.5 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="font-mono text-[11px] text-[#68746f] group-hover:text-[#315f56] transition-colors">
              Don't ask me again
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-[#68746f] border border-[#d8ded8] rounded-xl hover:bg-[#f7f8f5] hover:border-[#b0bab5] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(dontAskAgain)}
              className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
