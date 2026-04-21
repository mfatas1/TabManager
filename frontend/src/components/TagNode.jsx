import { Handle, Position } from 'reactflow';

export default function TagNode({ data, selected }) {
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        rounded-full border-2 transition-all cursor-pointer
        ${selected
          ? 'border-[var(--tm-accent)] bg-[#f0ebf8]'
          : 'border-[var(--tm-border-mid)] bg-[var(--tm-accent-bg)] hover:border-[#7aa390] hover:bg-[#f0ebf8]'
        }
      `}
      style={{ width: 100, height: 100 }}
    >
      <Handle type="source" position={Position.Right} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Top} className="opacity-0 !w-0 !h-0" />

      <span
        className="text-[12px] font-bold text-[var(--tm-accent-hover)] text-center leading-tight px-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {data.label}
      </span>
      <span
        className="mt-1 text-[10px] text-[var(--tm-accent)]/50"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {data.count} {data.count === 1 ? 'link' : 'links'}
      </span>
    </div>
  );
}
