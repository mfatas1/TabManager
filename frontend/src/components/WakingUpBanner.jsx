import { useBackendStatus } from '../context/BackendStatusContext';

export default function WakingUpBanner() {
  const { wakingUp } = useBackendStatus();

  if (!wakingUp) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-[#26312d] text-white px-4 py-2.5 text-[12px] font-mono">
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
      </span>
      <span>Backend is waking up — this may take up to 30 seconds on first load</span>
    </div>
  );
}
