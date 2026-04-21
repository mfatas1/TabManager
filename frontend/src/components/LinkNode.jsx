import { Handle, Position } from 'reactflow';

export default function LinkNode({ data, selected }) {
  return (
    <div
      className={`
        relative rounded-lg border px-4 py-3 max-w-[240px]
        bg-white shadow-sm
        font-sans transition-all cursor-pointer
        ${selected
          ? 'border-[#8b6bbf]'
          : 'border-[var(--tm-border)] hover:border-[var(--tm-accent-subtle)]'
        }
      `}
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-colors ${
        selected ? 'bg-[#7a59ae]' : 'bg-[#d4c7e8]'
      }`} />

      <Handle type="source" position={Position.Right} className="!bg-[var(--tm-accent)] !border-[var(--tm-border-mid)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-[var(--tm-accent)] !border-[var(--tm-border-mid)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--tm-accent)] !border-[var(--tm-border-mid)] !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-[var(--tm-accent)] !border-[var(--tm-border-mid)] !w-2 !h-2" />

      <div className="pl-2">
        <div className="text-[11px] font-semibold text-[#1e1b2e] leading-snug line-clamp-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          {data.label}
        </div>
      </div>
    </div>
  );
}
