'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCall } from '@/lib/services/calls';
import { createCallTask } from '@/lib/services/call-tasks';
import { CallStatus } from '@/types/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FollowUpPrompt } from '@/components/calls/FollowUpPrompt';
import { validateFile } from '@/types/api';

export default function LogCallPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.ANSWERED);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [lastCallPhone, setLastCallPhone] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createCall(
      {
        clientPhoneNumber: phone,
        callStatus,
        durationMinutes: callStatus === CallStatus.ANSWERED ? parseInt(duration) : undefined,
        notes: notes || undefined,
      },
      screenshot || undefined,
    ),
    onSuccess: (data) => {
      toast.success('Call logged successfully');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });

      // Show follow-up prompt for answered calls
      if (callStatus === CallStatus.ANSWERED) {
        setLastCallPhone(phone);
        setShowFollowUp(true);
      } else {
        resetForm();
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to log call';
      toast.error(message);
    },
  });

  const followUpMutation = useMutation({
    mutationFn: (data: { taskDate: string; taskTime: string; notes?: string }) =>
      createCallTask({
        clientPhoneNumber: lastCallPhone,
        taskDate: data.taskDate,
        taskTime: data.taskTime,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Follow-up task created');
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
      setShowFollowUp(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create follow-up task');
    },
  });

  const resetForm = () => {
    setPhone('');
    setCallStatus(CallStatus.ANSWERED);
    setDuration('');
    setNotes('');
    setScreenshot(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }
      setScreenshot(file);
    }
  };

  const canSubmit = phone.trim() && (callStatus !== CallStatus.ANSWERED || (duration && parseInt(duration) > 0));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Call</h1>
        <p className="text-gray-500">Record a new outbound call</p>
      </div>

      <Card className="p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="space-y-4"
        >
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Call Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCallStatus(CallStatus.ANSWERED)}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  callStatus === CallStatus.ANSWERED
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-1" />
                Answered
              </button>
              <button
                type="button"
                onClick={() => setCallStatus(CallStatus.NOT_ANSWERED)}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  callStatus === CallStatus.NOT_ANSWERED
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-1" />
                Not Answered
              </button>
            </div>
          </div>

          {callStatus === CallStatus.ANSWERED && (
            <Input
              label="Duration (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 5"
              min={1}
              required
            />
          )}

          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Call notes..."
            maxLength={1000}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot (optional)</label>
            {screenshot ? (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 flex-1 truncate">{screenshot.name}</span>
                <button
                  type="button"
                  onClick={() => { setScreenshot(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <Upload className="w-4 h-4 inline mr-1" />
                Upload Screenshot (JPEG, PNG, PDF - max 5MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <Button type="submit" className="w-full" loading={createMutation.isPending} disabled={!canSubmit}>
            Log Call
          </Button>
        </form>
      </Card>

      <FollowUpPrompt
        isOpen={showFollowUp}
        onClose={() => { setShowFollowUp(false); resetForm(); }}
        onSubmit={(data) => followUpMutation.mutate(data)}
        clientPhoneNumber={lastCallPhone}
        loading={followUpMutation.isPending}
      />
    </div>
  );
}
