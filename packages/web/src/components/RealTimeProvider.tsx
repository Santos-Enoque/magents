import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useServerSentEvents } from '../hooks/useServerSentEvents';

interface RealTimeContextValue {
  isConnected: boolean;
  connectionType: 'websocket' | 'sse' | 'none';
  lastUpdate: string | null;
  onAgentUpdate: () => void;
  setRefreshCallback: (callback: () => void) => void;
}

const RealTimeContext = createContext<RealTimeContextValue | null>(null);

interface RealTimeProviderProps {
  children: React.ReactNode;
  preferredMethod?: 'websocket' | 'sse' | 'auto';
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({
  children,
  preferredMethod = 'auto',
}) => {
  const [connectionType, setConnectionType] = useState<'websocket' | 'sse' | 'none'>('none');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [refreshCallback, setRefreshCallback] = useState<(() => void) | null>(null);

  // WebSocket connection
  const { socket, isConnected: wsConnected } = useWebSocket();

  // Server-Sent Events connection
  const { isConnected: sseConnected } = useServerSentEvents('/api/events', {
    onEvent: (event) => {
      setLastUpdate(new Date().toISOString());
      if (['agent-status-changed', 'agent-created', 'agent-deleted'].includes(event.type)) {
        refreshCallback?.();
      }
    },
    onOpen: () => {
      if (preferredMethod === 'sse' || (preferredMethod === 'auto' && !wsConnected)) {
        setConnectionType('sse');
      }
    },
  });

  // Determine connection type and handle fallback
  useEffect(() => {
    if (preferredMethod === 'websocket' && wsConnected) {
      setConnectionType('websocket');
    } else if (preferredMethod === 'sse' && sseConnected) {
      setConnectionType('sse');
    } else if (preferredMethod === 'auto') {
      if (wsConnected) {
        setConnectionType('websocket');
      } else if (sseConnected) {
        setConnectionType('sse');
      } else {
        setConnectionType('none');
      }
    } else {
      setConnectionType('none');
    }
  }, [preferredMethod, wsConnected, sseConnected]);

  // Handle WebSocket events
  useEffect(() => {
    if (connectionType === 'websocket' && socket) {
      const handleAgentUpdate = () => {
        setLastUpdate(new Date().toISOString());
        refreshCallback?.();
      };

      socket.on('agent-status-changed', handleAgentUpdate);
      socket.on('agent-created', handleAgentUpdate);
      socket.on('agent-deleted', handleAgentUpdate);

      return () => {
        socket.off('agent-status-changed', handleAgentUpdate);
        socket.off('agent-created', handleAgentUpdate);
        socket.off('agent-deleted', handleAgentUpdate);
      };
    }
  }, [connectionType, socket, refreshCallback]);

  const onAgentUpdate = () => {
    setLastUpdate(new Date().toISOString());
    refreshCallback?.();
  };

  const setRefreshCallbackWrapper = (callback: () => void) => {
    setRefreshCallback(() => callback);
  };

  const value: RealTimeContextValue = {
    isConnected: wsConnected || sseConnected,
    connectionType,
    lastUpdate,
    onAgentUpdate,
    setRefreshCallback: setRefreshCallbackWrapper,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = (): RealTimeContextValue => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};