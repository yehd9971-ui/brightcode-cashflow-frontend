'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const MAX_RETRIES = 5;

interface UseCallWebSocketOptions {
  userId?: string;
  joinDashboard?: boolean;
  enabled?: boolean;
}

export function useCallWebSocket(options: UseCallWebSocketOptions = {}) {
  const { userId, joinDashboard = false, enabled = true } = options;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retriesRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${WS_URL}/calls`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false, // manual reconnection
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      retriesRef.current = 0;

      if (userId) {
        socket.emit('join:user', { userId });
      }
      if (joinDashboard) {
        socket.emit('join:dashboard');
      }
    });

    socket.on('stats:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
    });

    socket.on('dashboard:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
    });

    socket.on('call:created', () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    });

    socket.on('call:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    });

    socket.on('call:approved', () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'pending-count'] });
    });

    socket.on('call:rejected', () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'pending-count'] });
    });

    socket.on('task:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
    });

    socket.on('employee:status-change', () => {
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
    });

    const scheduleRetry = () => {
      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 16000);
        retriesRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, delay);
      }
    };

    socket.on('disconnect', () => {
      setIsConnected(false);
      scheduleRetry();
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      scheduleRetry();
    });

    return socket;
  }, [enabled, userId, joinDashboard, queryClient]);

  useEffect(() => {
    const socket = connect();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    socketRef.current?.disconnect();
    retriesRef.current = 0;
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  return { isConnected, reconnect, disconnect };
}
