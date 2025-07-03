import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseTerminalOptions {
  agentId?: string;
  isSystemTerminal?: boolean;
  onData?: (data: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface UseTerminalReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendData: (data: string) => void;
  connect: (agentId?: string) => void;
  disconnect: () => void;
}

export const useTerminal = (options: UseTerminalOptions = {}): UseTerminalReturn => {
  const { agentId, isSystemTerminal, onData, onConnect, onDisconnect, onError } = options;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = (targetAgentId?: string) => {
    if (socket?.connected) {
      disconnect();
    }

    setIsConnecting(true);
    setError(null);

    // Create socket connection for terminal
    const namespace = optionsRef.current.isSystemTerminal ? '/system-terminal' : '/terminal';
    const backendUrl = 'http://localhost:3001';
    const newSocket = io(`${backendUrl}${namespace}`, {
      query: targetAgentId ? { agentId: targetAgentId } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log(`Terminal connected to ${namespace}`);
      setIsConnected(true);
      setIsConnecting(false);
      optionsRef.current.onConnect?.();
    });

    newSocket.on('disconnect', () => {
      console.log(`Terminal disconnected from ${namespace}`);
      setIsConnected(false);
      setIsConnecting(false);
      optionsRef.current.onDisconnect?.();
    });

    newSocket.on('data', (data: string) => {
      optionsRef.current.onData?.(data);
    });

    newSocket.on('error', (err: any) => {
      console.error(`Terminal error on ${namespace}:`, err);
      const errorMessage = err?.message || 'Connection error';
      setError(errorMessage);
      setIsConnecting(false);
      optionsRef.current.onError?.(errorMessage);
    });

    newSocket.on('connect_error', (err: any) => {
      console.error(`Terminal connection error on ${namespace}:`, err);
      const errorMessage = err?.message || 'Failed to connect';
      setError(errorMessage);
      setIsConnecting(false);
      optionsRef.current.onError?.(errorMessage);
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  };

  const sendData = (data: string) => {
    if (socket?.connected) {
      socket.emit('input', data);
    }
  };

  // Auto-connect if agentId is provided or if it's a system terminal
  useEffect(() => {
    if (agentId) {
      connect(agentId);
    } else if (optionsRef.current.isSystemTerminal) {
      connect(); // Connect without agentId for system terminal
    }

    return () => {
      disconnect();
    };
  }, [agentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    sendData,
    connect,
    disconnect,
  };
};