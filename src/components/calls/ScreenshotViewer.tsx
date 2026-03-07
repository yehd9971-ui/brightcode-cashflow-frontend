'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, FileText, Loader2, Maximize2, AlertTriangle } from 'lucide-react';
import { getCallScreenshot } from '@/lib/services/calls';
import { CallScreenshotDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ScreenshotViewerProps {
  screenshot: CallScreenshotDto;
}

export function ScreenshotViewer({ screenshot }: ScreenshotViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div className="mt-4 space-y-3">
      <div className="relative group inline-block">
        <img 
          src={blobUrl!} 
          alt={screenshot.originalFilename} 
          className="max-w-full h-40 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => setIsFullscreen(true)}
        />
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
          onClick={() => setIsFullscreen(true)}
        >
          <Maximize2 className="w-8 h-8 text-white" />
        </div>
      </div>

      <Modal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="View Screenshot"
        size="lg" // Very large for image viewing
      >
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-lg gap-4">
          {screenshot.duplicateInstances && screenshot.duplicateInstances.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex gap-2 w-full">
              <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-900 mb-1">Warning: Identical image uploaded previously!</p>
                <ul className="list-disc pl-4 space-y-1">
                  {screenshot.duplicateInstances.map((dup, i) => (
                    <li key={i}>
                      By {dup.userEmail} for {dup.clientPhoneNumber} on {dup.dateEgypt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <img 
            src={blobUrl!} 
            alt={screenshot.originalFilename} 
            className="max-w-full max-h-[70vh] object-contain rounded border shadow-sm"
          />
        </div>
      </Modal>
    </div>
  );
}
