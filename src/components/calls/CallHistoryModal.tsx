import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalls } from '@/lib/services/calls';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CallStatusBadge, ApprovalStatusBadge } from '@/components/calls/CallStatusBadge';
import { formatDateShort } from '@/utils/formatters';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export function CallHistoryModal({ isOpen, onClose, phoneNumber }: CallHistoryModalProps) {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['calls-history', phoneNumber],
    queryFn: () => getCalls({ phoneNumber, limit: 100 }), // Get up to 100 historical calls
    enabled: isOpen && !!phoneNumber,
  });

  const calls = data?.data || [];

  const handleAddCall = () => {
    // Navigate to new call page with phone number in query
    router.push(`/calls/new?phone=${encodeURIComponent(phoneNumber)}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Call History: ${phoneNumber}`}
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleAddCall}>
            <Plus className="w-4 h-4 mr-1 inline" /> Update/Add Call
          </Button>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>
        ) : calls.length === 0 ? (
          <EmptyState title="No history" description="No previous calls found for this number." />
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
            {calls.map((call, index) => (
              <div key={call.id} className="relative pl-6">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500" />
                <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <span className="text-sm font-medium text-gray-500">{formatDateShort(call.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <CallStatusBadge status={call.callStatus} size="sm" />
                      {call.screenshot?.duplicateInstances && call.screenshot.duplicateInstances.length > 0 && (
                        <div 
                          className="bg-yellow-100 text-yellow-600 rounded-full p-1 shadow-sm border border-yellow-300 flex items-center justify-center cursor-help" 
                          title="Warning: Identical image uploaded previously!"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      <ApprovalStatusBadge status={call.approvalStatus} size="sm" />
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    {call.durationMinutes && <p><span className="text-gray-500 font-medium">Duration:</span> {call.durationMinutes} min</p>}
                    {call.notes ? (
                      <div>
                        <span className="text-gray-500 font-medium">Notes:</span>
                        <p className="mt-1 text-gray-800 bg-white p-2 rounded border">{call.notes}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">No notes provided</p>
                    )}
                    {call.user && (
                      <p className="text-xs text-gray-400 mt-2 text-right">Added by: {call.user.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
