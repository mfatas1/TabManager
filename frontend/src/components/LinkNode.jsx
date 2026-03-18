import { Handle, Position } from 'reactflow';

// Custom node component for React Flow
// Styled to match the app's design system via CSS classes
export default function LinkNode({ data, selected }) {
  return (
    <div className={`graph-node ${selected ? 'graph-node-selected' : ''}`}>
      {/* Source handle - for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--accent)' }}
      />
      {/* Target handle - for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'var(--accent)' }}
      />

      <div className="graph-node-title">{data.label}</div>
      {data.tags && data.tags.length > 0 && (
        <div className="graph-node-tags">
          {data.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="graph-node-tag">
              {typeof tag === 'string' ? tag : tag.name}
            </span>
          ))}
          {data.tags.length > 3 && (
            <span className="graph-node-tag graph-node-tag-more">
              +{data.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}