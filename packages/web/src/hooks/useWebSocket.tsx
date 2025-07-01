import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, AgentEvent } from '@magents/shared';
import { toast } from 'react-toastify';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (event: string) => void;
  unsubscribe: (event: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      toast.success('Connected to Magents server');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      toast.warning('Disconnected from Magents server');
    });

    newSocket.on('message', (message: WebSocketMessage) => {
      console.log('WebSocket message:', message);
    });

    newSocket.on('agent:event', (message: WebSocketMessage<AgentEvent>) => {
      const { data } = message;
      const eventText = `Agent ${data.agentId} ${data.event}`;
      
      switch (data.event) {
        case 'created':
          toast.info(eventText);
          break;
        case 'started':
          toast.success(eventText);
          break;
        case 'stopped':
          toast.info(eventText);
          break;
        case 'error':
          toast.error(eventText);
          break;
      }
    });

    newSocket.on('project:update', (message: WebSocketMessage) => {
      console.log('Project update:', message);
      toast.info('Project updated');
    });

    newSocket.on('config:change', (message: WebSocketMessage) => {
      console.log('Config change:', message);
      toast.info('Configuration updated');
    });

    // Health check ping
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    newSocket.on('pong', (data) => {
      console.log('Pong received:', data);
    });

    setSocket(newSocket);

    return () => {
      clearInterval(pingInterval);
      newSocket.close();
    };
  }, []);

  const subscribe = (event: string) => {
    if (socket && socket.connected) {
      socket.emit(`subscribe:${event}`);
    }
  };

  const unsubscribe = (event: string) => {
    if (socket && socket.connected) {
      socket.emit(`unsubscribe:${event}`);
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};