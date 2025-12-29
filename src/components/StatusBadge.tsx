import type { DeploymentState } from '../types';

interface StatusBadgeProps {
  state: DeploymentState | null;
}

const stateConfig: Record<string, { color: string; label: string; animate?: boolean }> = {
  BUILDING: { color: 'bg-yellow-500', label: 'Building', animate: true },
  INITIALIZING: { color: 'bg-yellow-500', label: 'Initializing', animate: true },
  QUEUED: { color: 'bg-gray-400', label: 'Queued' },
  READY: { color: 'bg-green-500', label: 'Ready' },
  ERROR: { color: 'bg-red-500', label: 'Error' },
  CANCELED: { color: 'bg-gray-500', label: 'Canceled' },
  UNKNOWN: { color: 'bg-gray-400', label: 'Unknown' },
};

export function StatusBadge({ state }: StatusBadgeProps) {
  const config = stateConfig[state || 'UNKNOWN'] || stateConfig.UNKNOWN;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${
          config.animate ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-xs text-vercel-gray-400">{config.label}</span>
    </span>
  );
}
