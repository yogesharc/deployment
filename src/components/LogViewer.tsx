import { useEffect, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { useStore } from '../store';

export function LogViewer() {
  const { logs, isStreaming, fetchLogs, startStreaming } = useLogs();
  const { selectedDeploymentId, deployments, setView, setSelectedDeployment } = useStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const deployment = deployments.find((d) => d.uid === selectedDeploymentId);
  const isBuilding = deployment?.state === 'BUILDING' || deployment?.readyState === 'BUILDING';

  useEffect(() => {
    if (selectedDeploymentId) {
      if (isBuilding) {
        startStreaming(selectedDeploymentId);
      } else {
        fetchLogs(selectedDeploymentId);
      }
    }
  }, [selectedDeploymentId, isBuilding, fetchLogs, startStreaming]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleBack = () => {
    setSelectedDeployment(null);
    setView('deployments');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-vercel-gray-800">
        <button
          onClick={handleBack}
          className="p-1 text-vercel-gray-400 hover:text-vercel-white rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-vercel-white truncate">
            {deployment?.name || 'Build Logs'}
          </h2>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Streaming live...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-vercel-gray-900">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-vercel-gray-500">
            {isStreaming ? 'Waiting for logs...' : 'No logs available'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`leading-relaxed ${
                  log.isError ? 'text-red-400' : 'text-vercel-gray-300'
                }`}
              >
                {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
