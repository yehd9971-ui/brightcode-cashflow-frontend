'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook to track online/offline status
 * Shows persistent notification when offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineToastId, setOfflineToastId] = useState<string | null>(null);

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);

      // Dismiss offline toast if it exists
      if (offlineToastId) {
        toast.dismiss(offlineToastId);
        setOfflineToastId(null);
      }

      // Show brief success message
      toast.success('Connection restored', {
        duration: 3000,
        icon: '🟢',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);

      // Show persistent offline notification
      const toastId = toast.error(
        'You are currently offline. Some features may be unavailable.',
        {
          duration: Infinity, // Persist until dismissed or connection restored
          icon: '🔴',
          id: 'offline-notification', // Prevent duplicates
        }
      );

      setOfflineToastId(toastId);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Dismiss toast on unmount
      if (offlineToastId) {
        toast.dismiss(offlineToastId);
      }
    };
  }, [offlineToastId]);

  return isOnline;
}
