import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useServerSentEvents } from '../hooks/useServerSentEvents';

export const ConnectionDiagnostics: React.FC = () => {
  const { isConnected: wsConnected, socket } = useWebSocket();
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [metricsData, setMetricsData] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  // Test SSE connection
  const { isConnected: sseConnected, error: sseError } = useServerSentEvents('/api/metrics', {
    onEvent: (event) => {
      setSseStatus('connected');
      if (event.type === 'system-metrics') {
        setMetricsData(event.data);
      }
    },
    onError: () => {
      setSseStatus('error');
    },
    onOpen: () => {
      setSseStatus('connected');
    }
  });

  useEffect(() => {
    const logs: string[] = [];
    
    // Check WebSocket URL
    logs.push(`WebSocket URL: ${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}`);
    logs.push(`Frontend URL: ${window.location.origin}`);
    logs.push(`WebSocket Connected: ${wsConnected}`);
    logs.push(`Socket.IO ID: ${socket?.id || 'Not connected'}`);
    logs.push(`SSE Status: ${sseStatus}`);
    
    // Check if backend is reachable
    fetch('/api/health')
      .then(res => {
        logs.push(`Backend Health Check: ${res.ok ? 'OK' : 'Failed'} (${res.status})`);
        setDiagnostics([...logs]);
      })
      .catch(err => {
        logs.push(`Backend Health Check: Error - ${err.message}`);
        setDiagnostics([...logs]);
      });
  }, [wsConnected, socket, sseStatus]);

  return (
    <div className="bg-background-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Connection Diagnostics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground-secondary">WebSocket</h4>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {socket?.id && (
            <p className="text-xs text-foreground-tertiary">ID: {socket.id}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground-secondary">SSE (Metrics)</h4>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              sseStatus === 'connected' ? 'bg-green-500' : 
              sseStatus === 'connecting' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`} />
            <span className="text-sm capitalize">{sseStatus}</span>
          </div>
          {sseError && (
            <p className="text-xs text-red-500">Error: {sseError}</p>
          )}
        </div>
      </div>
      
      {metricsData && (
        <div className="mt-4 p-3 bg-background-default rounded border border-border">
          <h4 className="text-sm font-medium text-foreground-secondary mb-2">Latest Metrics</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>CPU: {metricsData.cpu?.toFixed(1)}%</div>
            <div>Memory: {metricsData.memory?.toFixed(1)}%</div>
            <div>Network In: {(metricsData.networkIn / 1024 / 1024).toFixed(1)} MB</div>
            <div>Network Out: {(metricsData.networkOut / 1024 / 1024).toFixed(1)} MB</div>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-background-default rounded border border-border">
        <h4 className="text-sm font-medium text-foreground-secondary mb-2">Diagnostic Info</h4>
        <ul className="space-y-1 text-xs font-mono">
          {diagnostics.map((log, i) => (
            <li key={i} className="text-foreground-tertiary">{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};