import { Handle, Position } from 'reactflow';

export default function LinkNode({ data, selected }) {
  return (
    <div
      className={`
        relative rounded-lg border px-4 py-3 max-w-[240px]
        bg-white shadow-sm
        font-sans transition-all cursor-pointer
        ${selected
          ? 'border-[#6e9a88]'
          : 'border-[#d8ded8] hover:border-[#a8bfb2]'
        }
      `}
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-colors ${
        selected ? 'bg-[#5a9b86]' : 'bg-[#b7d3c6]'
      }`} />

      <Handle type="source" position={Position.Right} className="!bg-[#4f8f7a] !border-[#9cb8aa] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-[#4f8f7a] !border-[#9cb8aa] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#4f8f7a] !border-[#9cb8aa] !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-[#4f8f7a] !border-[#9cb8aa] !w-2 !h-2" />

      <div className="pl-2">
        <div className="text-[11px] font-semibold text-[#26312d] leading-snug line-clamp-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          {data.label}
        </div>
      </div>
    </div>
  );
}
