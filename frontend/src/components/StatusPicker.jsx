import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const statusConfig = {
  // link statuses
  unread:    { pill: 'bg-[#f0eef8] text-[var(--tm-text-secondary)] border-[var(--tm-border)]',    dot: 'bg-[var(--tm-status-neutral)]' },
  reading:   { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  done:      { pill: 'bg-[var(--tm-accent-bg)] text-[var(--tm-accent-hover)] border-[var(--tm-accent-bg-deep)]',    dot: 'bg-[var(--tm-accent)]' },
  reference: { pill: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-400' },
  skip:      { pill: 'bg-[#f5f5f5] text-[#b0b8b4] border-[#e0e0e0]',    dot: 'bg-[#d0d5d2]' },
  // task statuses
  todo:      { pill: 'bg-[#f0eef8] text-[var(--tm-text-secondary)] border-[var(--tm-border)]',    dot: 'bg-[var(--tm-status-neutral)]' },
  doing:     { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
};

const fallback = { pill: 'bg-[#f0eef8] text-[var(--tm-text-secondary)] border-[var(--tm-border)]', dot: 'bg-[var(--tm-status-neutral)]' };

export default function StatusPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = statusConfig[value] || fallback;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border transition-all hover:brightness-95 ${current.pill}`}
      >
        <span className={`size-1.5 rounded-full ${current.dot}`} />
        {value}
        <ChevronDown className={`size-2.5 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[120px] rounded-xl border border-[#e8dff2] bg-white shadow-lg shadow-black/8 py-1.5 overflow-hidden">
          {options.map(opt => {
            const cfg = statusConfig[opt] || fallback;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 font-mono text-[11px] flex items-center gap-2 transition-colors hover:bg-[#f7f8f5] ${value === opt ? 'opacity-100' : 'opacity-70'}`}
              >
                <span className={`size-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <span className={value === opt ? 'font-semibold text-[#26312d]' : 'text-[var(--tm-text-secondary)]'}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
