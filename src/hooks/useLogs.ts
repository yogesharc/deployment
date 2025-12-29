import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useStore } from '../store';
import type { LogLine } from '../types';

export function useLogs() {
  const {
    logs,
    selectedDeploymentId,
    isStreaming,
    setLogs,
    addLog,
    clearLogs,
    setStreaming,
  } = useStore();

  const fetchLogs = useCallback(async (deploymentId: string) => {
    clearLogs();
    try {
      const logLines = await invoke<LogLine[]>('fetch_deployment_logs', { deploymentId });
      setLogs(logLines);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [setLogs, clearLogs]);

  const startStreaming = useCallback(async (deploymentId: string) => {
    clearLogs();
    setStreaming(true);

    try {
      await invoke('stream_deployment_logs', { deploymentId });
    } catch (error) {
      console.error('Failed to start log streaming:', error);
      setStreaming(false);
    }
  }, [clearLogs, setStreaming]);

  // Listen for log events
  useEffect(() => {
    let unlistenLog: UnlistenFn | null = null;
    let unlistenComplete: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    const setupListeners = async () => {
      unlistenLog = await listen<LogLine>('deployment-log', (event) => {
        addLog(event.payload);
      });

      unlistenComplete = await listen<string>('deployment-log-complete', () => {
        setStreaming(false);
      });

      unlistenError = await listen<string>('deployment-log-error', (event) => {
        console.error('Log stream error:', event.payload);
        setStreaming(false);
      });
    };

    setupListeners();

    return () => {
      unlistenLog?.();
      unlistenComplete?.();
      unlistenError?.();
    };
  }, [addLog, setStreaming]);

  return {
    logs,
    selectedDeploymentId,
    isStreaming,
    fetchLogs,
    startStreaming,
    clearLogs,
  };
}
