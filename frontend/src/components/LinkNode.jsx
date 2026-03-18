import { Handle, Position } from 'reactflow';

// Custom node component for React Flow
// Styled to match the app's indigo/dark design system
export default function LinkNode({ data, selected }) {
  return (
    <div 
      className={`
        rounded-xl border px-4 py-3 max-w-[260px]
        bg-[#1e2433] shadow-lg
        font-sans transition-all cursor-pointer
        ${selected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/30' 
          : 'border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5'
        }
      `}
    >
      {/* Source handle - for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-indigo-500 !border-indigo-400"
      />
      {/* Target handle - for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-indigo-500 !border-indigo-400"
      />

      <div className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2">
        {data.label}
      </div>
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.tags.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400"
            >
              {typeof tag === 'string' ? tag : tag.name}
            </span>
          ))}
          {data.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-500">
              +{data.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
