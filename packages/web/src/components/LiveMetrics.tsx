import React, { useState, useEffect } from 'react';
import { useServerSentEvents } from '../hooks/useServerSentEvents';
import {
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

interface SystemMetrics {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
  timestamp: string;
}

interface LiveMetricsProps {
  className?: string;
}

export const LiveMetrics: React.FC<LiveMetricsProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<SystemMetrics[]>([]);

  const { isConnected, error } = useServerSentEvents('/api/metrics', {
    onEvent: (event) => {
      if (event.type === 'system-metrics') {
        const newMetrics = event.data as SystemMetrics;
        setMetrics(newMetrics);
        setHistory(prev => [...prev.slice(-29), newMetrics]); // Keep last 30 entries
      }
    },
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getMetricTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = values.slice(-6, -3);
    const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    if (avg > prevAvg * 1.1) return 'increasing';
    if (avg < prevAvg * 0.9) return 'decreasing';
    return 'stable';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-status-error';
      case 'decreasing': return 'text-status-success';
      default: return 'text-foreground-secondary';
    }
  };

  const cpuHistory = history.map(m => m.cpu);
  const memoryHistory = history.map(m => m.memory);

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* CPU Usage */}
      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <CpuChipIcon className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-xs text-foreground-tertiary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-lg font-semibold text-foreground">
            {metrics ? `${metrics.cpu.toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-foreground-secondary">CPU Usage</div>
        </div>
        
        {history.length > 1 && (
          <div className={`text-xs ${getTrendColor(getMetricTrend(cpuHistory))}`}>
            Trend: {getMetricTrend(cpuHistory)}
          </div>
        )}
      </div>

      {/* Memory Usage */}
      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <ChartBarIcon className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-xs text-foreground-tertiary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-lg font-semibold text-foreground">
            {metrics ? `${metrics.memory.toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-foreground-secondary">Memory Usage</div>
        </div>
        
        {history.length > 1 && (
          <div className={`text-xs ${getTrendColor(getMetricTrend(memoryHistory))}`}>
            Trend: {getMetricTrend(memoryHistory)}
          </div>
        )}
      </div>

      {/* Network I/O */}
      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <SignalIcon className="w-4 h-4 text-green-500" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-xs text-foreground-tertiary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="mb-1">
          <div className="text-sm font-medium text-foreground">
            ↓ {metrics ? formatBytes(metrics.networkIn) : '--'}
          </div>
          <div className="text-sm font-medium text-foreground">
            ↑ {metrics ? formatBytes(metrics.networkOut) : '--'}
          </div>
        </div>
        
        <div className="text-xs text-foreground-secondary">Network I/O</div>
      </div>

      {/* System Uptime */}
      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <ClockIcon className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-xs text-foreground-tertiary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-lg font-semibold text-foreground">
            {metrics ? formatUptime(metrics.uptime) : '--'}
          </div>
          <div className="text-xs text-foreground-secondary">System Uptime</div>
        </div>
        
        {metrics && (
          <div className="text-xs text-foreground-tertiary">
            Since {new Date(Date.now() - metrics.uptime * 1000).toLocaleDateString()}
          </div>
        )}
      </div>

      {error && (
        <div className="col-span-full bg-status-error/20 border border-status-error rounded-lg p-3">
          <div className="text-sm text-status-error">
            Connection Error: {error}
          </div>
        </div>
      )}
    </div>
  );
};