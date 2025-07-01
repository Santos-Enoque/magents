import React, { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Play, Square, Monitor, Command } from 'lucide-react';
import { Agent } from '@magents/shared';

interface TmuxSession {
  sessionName: string;
  windows: string[];
  activeWindow: string;
  exists: boolean;
}

interface TmuxContent {
  sessionName: string;
  windowName: string;
  windows: string[];
  activeWindow: string;
  content: string;
  lines: number;
  timestamp: string;
}

interface TmuxViewerProps {
  agent: Agent;
}

export const TmuxViewer: React.FC<TmuxViewerProps> = ({ agent }) => {
  const [sessionInfo, setSessionInfo] = useState<TmuxSession | null>(null);
  const [content, setContent] = useState<TmuxContent | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<string>('');
  const [lines, setLines] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessionInfo = async () => {
    try {
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/info`);
      const data = await response.json();
      
      if (data.success) {
        setSessionInfo(data.data);
        if (!selectedWindow && data.data.windows.length > 0) {
          setSelectedWindow(data.data.activeWindow);
        }
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch session info');
      }
    } catch (err) {
      setError('Network error while fetching session info');
    }
  };

  const fetchContent = async () => {
    if (!sessionInfo) return;
    
    setIsLoading(true);
    try {
      const windowParam = selectedWindow ? `?window=${selectedWindow}&lines=${lines}` : `?lines=${lines}`;
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/content${windowParam}`);
      const data = await response.json();
      
      if (data.success) {
        setContent(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch session content');
      }
    } catch (err) {
      setError('Network error while fetching content');
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async (command: string) => {
    try {
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          window: selectedWindow
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh content after sending command
        setTimeout(fetchContent, 500);
      } else {
        setError(data.error || 'Failed to send command');
      }
    } catch (err) {
      setError('Network error while sending command');
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, [agent.tmuxSession]);

  useEffect(() => {
    if (sessionInfo) {
      fetchContent();
    }
  }, [sessionInfo, selectedWindow, lines]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchContent, 3000); // Refresh every 3 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, sessionInfo, selectedWindow, lines]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <Terminal className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Terminal Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Monitor className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Session: {agent.tmuxSession}</span>
          </div>
          
          {sessionInfo.windows.length > 1 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Window:</label>
              <select
                value={selectedWindow}
                onChange={(e) => setSelectedWindow(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {sessionInfo.windows.map(window => (
                  <option key={window} value={window}>{window}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Lines:</label>
            <select
              value={lines}
              onChange={(e) => setLines(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
              autoRefresh 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {autoRefresh ? 'Stop' : 'Auto-refresh'}
          </button>
          
          <button
            onClick={fetchContent}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="bg-black rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">
                {content?.windowName || selectedWindow} 
                {content && ` - ${content.lines} lines`}
              </span>
            </div>
            {content && (
              <span className="text-xs text-gray-400">
                Updated: {new Date(content.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4 h-96 overflow-y-auto font-mono text-sm text-green-400 whitespace-pre-wrap">
          {content?.content || (isLoading ? 'Loading...' : 'No content available')}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Command className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Quick Commands:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Clear', command: 'clear' },
            { label: 'Git Status', command: 'git status' },
            { label: 'List Files', command: 'ls -la' },
            { label: 'Current Dir', command: 'pwd' },
          ].map((cmd) => (
            <button
              key={cmd.command}
              onClick={() => sendCommand(cmd.command)}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};