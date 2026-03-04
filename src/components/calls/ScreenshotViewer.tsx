'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { getCallScreenshot } from '@/lib/services/calls';
import { CallScreenshotDto } from '@/types/api';
import { Button } from '@/components/ui/Button';

interface ScreenshotViewerProps {
  screenshot: CallScreenshotDto;
}

export function ScreenshotViewer({ screenshot }: ScreenshotViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScreenshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await getCallScreenshot(screenshot.id);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch {
      setError('Failed to load screenshot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!blobUrl && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={loadScreenshot}>
        {screenshot.mimeType === 'application/pdf' ? (
          <FileText className="w-4 h-4 mr-1" />
        ) : (
          <ImageIcon className="w-4 h-4 mr-1" />
        )}
        View Screenshot
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (screenshot.mimeType === 'application/pdf') {
    return (
      <a href={blobUrl!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
        View PDF Screenshot
      </a>
    );
  }

  return (
    <div className="mt-2">
      <img src={blobUrl!} alt={screenshot.originalFilename} className="max-w-full max-h-64 rounded-lg border" />
    </div>
  );
}
