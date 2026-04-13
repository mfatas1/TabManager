import { Handle, Position } from 'reactflow';

export default function TagNode({ data, selected }) {
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        rounded-full border-2 transition-all cursor-pointer
        ${selected
          ? 'border-[#4f8f7a] bg-[#dceae2]'
          : 'border-[#9cb8aa] bg-[#edf4ef] hover:border-[#7aa390] hover:bg-[#dceae2]'
        }
      `}
      style={{ width: 100, height: 100 }}
    >
      <Handle type="source" position={Position.Right} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Top} className="opacity-0 !w-0 !h-0" />

      <span
        className="text-[12px] font-bold text-[#315f56] text-center leading-tight px-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {data.label}
      </span>
      <span
        className="mt-1 text-[10px] text-[#4f8f7a]/50"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {data.count} {data.count === 1 ? 'link' : 'links'}
      </span>
    </div>
  );
}
