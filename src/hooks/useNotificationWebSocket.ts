'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const MAX_RETRIES = 5;

interface UseNotificationWebSocketOptions {
  userId?: string;
  enabled?: boolean;
}

export function useNotificationWebSocket(options: UseNotificationWebSocketOptions = {}) {
  const { userId, enabled = true } = options;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retriesRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !userId) return;

    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      retriesRef.current = 0;

      socket.emit('join:user', { userId });
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
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
  }, [enabled, userId, queryClient]);

  useEffect(() => {
    const socket = connect();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { isConnected };
}
