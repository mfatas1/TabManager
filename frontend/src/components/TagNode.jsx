import { Handle, Position } from 'reactflow';

export default function TagNode({ data, selected }) {
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        rounded-full border-2 transition-all cursor-pointer
        ${selected
          ? 'border-indigo-400 bg-indigo-500/20 shadow-xl shadow-indigo-500/25'
          : 'border-indigo-500/40 bg-indigo-500/8 hover:border-indigo-400/70 hover:bg-indigo-500/15 hover:shadow-lg hover:shadow-indigo-500/15'
        }
      `}
      style={{ width: 100, height: 100 }}
    >
      <Handle type="source" position={Position.Right} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Top} className="opacity-0 !w-0 !h-0" />

      <span
        className="text-[12px] font-bold text-indigo-300 text-center leading-tight px-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {data.label}
      </span>
      <span
        className="mt-1 text-[10px] text-indigo-400/50"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {data.count} {data.count === 1 ? 'link' : 'links'}
      </span>
    </div>
  );
}
