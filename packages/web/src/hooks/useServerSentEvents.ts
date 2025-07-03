import { useEffect, useRef, useState } from 'react';

interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface UseServerSentEventsOptions {
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseServerSentEventsReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  events: SSEEvent[];
  reconnect: () => void;
  disconnect: () => void;
}

export const useServerSentEvents = (
  url: string,
  options: UseServerSentEventsOptions = {}
): UseServerSentEventsReturn => {
  const {
    onEvent,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  optionsRef.current = options;

  const connect = () => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        optionsRef.current.onOpen?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData: SSEEvent = {
            type: 'message',
            data: JSON.parse(event.data),
            timestamp: new Date().toISOString(),
          };
          
          setEvents(prev => [...prev.slice(-99), eventData]); // Keep last 100 events
          optionsRef.current.onEvent?.(eventData);
        } catch (parseError) {
          console.error('Failed to parse SSE event data:', parseError);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        
        const errorMessage = 'SSE connection error';
        setError(errorMessage);
        optionsRef.current.onError?.(event);

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      // Handle custom event types
      eventSource.addEventListener('agent-status-changed', (event) => {
        const eventData: SSEEvent = {
          type: 'agent-status-changed',
          data: JSON.parse((event as MessageEvent).data),
          timestamp: new Date().toISOString(),
        };
        
        setEvents(prev => [...prev.slice(-99), eventData]);
        optionsRef.current.onEvent?.(eventData);
      });

      eventSource.addEventListener('agent-created', (event) => {
        const eventData: SSEEvent = {
          type: 'agent-created',
          data: JSON.parse((event as MessageEvent).data),
          timestamp: new Date().toISOString(),
        };
        
        setEvents(prev => [...prev.slice(-99), eventData]);
        optionsRef.current.onEvent?.(eventData);
      });

      eventSource.addEventListener('agent-deleted', (event) => {
        const eventData: SSEEvent = {
          type: 'agent-deleted',
          data: JSON.parse((event as MessageEvent).data),
          timestamp: new Date().toISOString(),
        };
        
        setEvents(prev => [...prev.slice(-99), eventData]);
        optionsRef.current.onEvent?.(eventData);
      });

      eventSource.addEventListener('system-metrics', (event) => {
        const eventData: SSEEvent = {
          type: 'system-metrics',
          data: JSON.parse((event as MessageEvent).data),
          timestamp: new Date().toISOString(),
        };
        
        setEvents(prev => [...prev.slice(-99), eventData]);
        optionsRef.current.onEvent?.(eventData);
      });

    } catch (error) {
      setIsConnecting(false);
      setError((error as Error).message);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
    optionsRef.current.onClose?.();
  };

  const reconnect = () => {
    disconnect();
    setTimeout(connect, 100);
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    events,
    reconnect,
    disconnect,
  };
};