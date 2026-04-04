'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ThumbsDown } from 'lucide-react';

interface FollowUpPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { taskDate: string; taskTime: string; notes?: string }) => void;
  onNotInterested?: () => void;
  notInterestedLoading?: boolean;
  clientPhoneNumber: string;
  loading?: boolean;
}

export function FollowUpPrompt({ isOpen, onClose, onSubmit, onNotInterested, notInterestedLoading, clientPhoneNumber, loading }: FollowUpPromptProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [taskDate, setTaskDate] = useState(defaultDate);
  const [taskTime, setTaskTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ taskDate, taskTime, notes: notes || undefined });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Follow-up"
      size="md"
      footer={
        <>
          {onNotInterested && (
            <Button
              variant="danger"
              onClick={onNotInterested}
              loading={notInterestedLoading}
            >
              <ThumbsDown className="w-4 h-4 mr-1" /> Not Interested
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Skip</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!taskDate || !taskTime}>
            Schedule Follow-up
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Schedule a follow-up task for <strong>{clientPhoneNumber}</strong>
        </p>
        <Input
          label="Date"
          type="date"
          value={taskDate}
          onChange={(e) => setTaskDate(e.target.value)}
          required
        />
        <Input
          label="Time"
          type="time"
          value={taskTime}
          onChange={(e) => setTaskTime(e.target.value)}
          required
        />
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Follow-up notes..."
          maxLength={500}
        />
      </div>
    </Modal>
  );
}
