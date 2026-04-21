import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';

export default function ProjectDropdown({ projects, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = projects.find((project) => String(project.id) === String(value));

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border border-[#d8ded8] rounded-lg bg-white text-left hover:border-[#8baea0] transition-colors"
      >
        <span className={selected ? 'text-[#26312d]' : 'text-[#9aa39f]'}>
          {selected ? selected.name : 'Choose project'}
        </span>
        <ChevronDown className={`size-3.5 text-[#9aa39f] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 rounded-xl border border-[#e9d5ff] bg-white shadow-lg shadow-black/8 py-1.5 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-[#9aa39f] hover:bg-[#f7f8f5] transition-colors"
          >
            Choose project
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                onChange(String(project.id));
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm transition-colors hover:bg-[#f7f8f5] ${
                String(value) === String(project.id) ? 'text-[#5b21b6] font-medium' : 'text-[#26312d]'
              }`}
            >
              <FolderOpen className="size-3.5 text-[#7c3aed] flex-shrink-0" />
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
