import { Handle, Position } from 'reactflow';

export default function LinkNode({ data, selected }) {
  return (
    <div
      className={`
        relative rounded-xl border px-4 py-3 max-w-[240px]
        bg-[#0d1017] shadow-lg
        font-sans transition-all cursor-pointer
        ${selected
          ? 'border-indigo-500/70 shadow-indigo-500/15'
          : 'border-white/8 hover:border-indigo-500/30 hover:shadow-indigo-500/8'
        }
      `}
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-colors ${
        selected ? 'bg-indigo-400' : 'bg-indigo-500/30'
      }`} />

      <Handle type="source" position={Position.Right} className="!bg-indigo-500/60 !border-indigo-400/40 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-indigo-500/60 !border-indigo-400/40 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500/60 !border-indigo-400/40 !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-indigo-500/60 !border-indigo-400/40 !w-2 !h-2" />

      <div className="pl-2">
        <div className="text-[11px] font-semibold text-slate-200 leading-snug line-clamp-2 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          {data.label}
        </div>
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/10 text-indigo-400/70"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {typeof tag === 'string' ? tag : tag.name}
              </span>
            ))}
            {data.tags.length > 3 && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] text-slate-600"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
