'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Upload, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCall, getCalls } from '@/lib/services/calls';
import { createCallTask } from '@/lib/services/call-tasks';
import { markNotInterested, getMyNumbers, updateLeadStatus } from '@/lib/services/client-numbers';
import { CallStatus, LeadStatus } from '@/types/api';
import { normalizePhoneNumber } from '@/utils/phone';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FollowUpPrompt } from '@/components/calls/FollowUpPrompt';
import { validateFile } from '@/types/api';

export default function LogCallPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialPhone = searchParams.get('phone') || '';
  const [phone, setPhone] = useState(initialPhone);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.ANSWERED);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [lastCallPhone, setLastCallPhone] = useState('');

  const previewUrl = useMemo(() => {
    if (screenshot && screenshot.type.startsWith('image/')) {
      return URL.createObjectURL(screenshot);
    }
    return null;
  }, [screenshot]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Check if this phone has a first NOT_ANSWERED today (making this the 2nd attempt)
  const normalizedPhone = normalizePhoneNumber(phone);
  const todayEgypt = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  const { data: phoneCalls, isLoading: isPhoneCheckLoading, isError: isPhoneCheckError } = useQuery({
    queryKey: ['calls', 'phone-check', normalizedPhone, todayEgypt],
    queryFn: () => getCalls({ phoneNumber: normalizedPhone, date: todayEgypt, callStatus: CallStatus.NOT_ANSWERED, limit: 5 }),
    enabled: normalizedPhone.length >= 7,
  });
  const isSecondAttempt = isPhoneCheckError || (phoneCalls?.data?.length ?? 0) >= 1;
  const phoneCheckPending = callStatus === CallStatus.NOT_ANSWERED && normalizedPhone.length >= 7 && isPhoneCheckLoading;

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
      if (data.lateReportPenalty && data.lateReportPenalty > 0) {
        toast.error(
          `Late report penalty: ${data.lateReportPenalty} EGP deducted (${data.lateReportDelayMinutes} min delay, ${data.lateReportPenaltyMinutes} min over 3-min grace)`,
          { duration: 8000 },
        );
      } else {
        toast.success('Call logged successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['calls', 'my-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'needs-retry'] });
      queryClient.invalidateQueries({ queryKey: ['call-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['my-call-status'] });
      queryClient.invalidateQueries({ queryKey: ['pending-completions'] });

      // Show follow-up prompt for answered calls, then redirect
      if (callStatus === CallStatus.ANSWERED) {
        setLastCallPhone(phone);
        setShowFollowUp(true);
      } else {
        router.push('/numbers');
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
      router.push('/numbers');
    },
    onError: () => {
      toast.error('Failed to create follow-up task');
    },
  });

  // Find the ClientNumber ID for NI marking
  const { data: myNumbersData } = useQuery({
    queryKey: ['my-numbers'],
    queryFn: () => getMyNumbers({ page: 1, limit: 100 }),
  });

  const notInterestedMutation = useMutation({
    mutationFn: () => {
      const cn = myNumbersData?.data.find(
        (n) => normalizePhoneNumber(n.normalizedPhone) === normalizePhoneNumber(lastCallPhone)
      );
      if (!cn) throw new Error('Number not found in your assigned list');
      return markNotInterested(cn.id);
    },
    onSuccess: () => {
      toast.success('Marked as not interested (pending approval)');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['ni-pending'] });
      setShowFollowUp(false);
      router.push('/numbers');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed');
    },
  });

  const hotLeadMutation = useMutation({
    mutationFn: () => {
      const cn = myNumbersData?.data.find(
        (n) => normalizePhoneNumber(n.normalizedPhone) === normalizePhoneNumber(lastCallPhone)
      );
      if (!cn) throw new Error('Number not found in your assigned list');
      return updateLeadStatus(cn.id, { leadStatus: LeadStatus.HOT_LEAD });
    },
    onSuccess: () => {
      toast.success('Marked as Hot Lead!');
      queryClient.invalidateQueries({ queryKey: ['my-numbers'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed');
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

  // Screenshot required for: Answered calls (always) and second Not Answered attempt
  // First Not Answered: no screenshot, hidden entirely
  const screenshotRequired = callStatus === CallStatus.ANSWERED || (callStatus === CallStatus.NOT_ANSWERED && isSecondAttempt);
  const canSubmit = !phoneCheckPending && phone.trim() && (callStatus !== CallStatus.ANSWERED || (duration && parseInt(duration) > 0 && notes.trim() !== '')) && (screenshotRequired ? !!screenshot : true);

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
            disabled={!!initialPhone}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes {callStatus === CallStatus.ANSWERED && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Call notes..."
              maxLength={1000}
              required={callStatus === CallStatus.ANSWERED}
            />
          </div>

          {screenshotRequired && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot <span className="text-red-500">*</span>
            </label>
            {screenshot ? (
              <div className="relative inline-block w-full">
                {previewUrl ? (
                  <div className="relative flex justify-center bg-gray-50 border rounded-lg p-2 min-h-[120px]">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg justify-center border">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 truncate max-w-xs">{screenshot.name}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setScreenshot(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-white/90 shadow rounded-full p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Remove screenshot"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <div className="bg-gray-100 p-3 rounded-full">
                  <Upload className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <span className="font-semibold text-blue-600 hover:underline">Click to upload</span>
                  <span className="text-gray-500"> or drag and drop</span>
                </div>
                <p className="text-xs text-gray-400">Any Image format (max 5MB)</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          )}

          <Button type="submit" className="w-full" loading={createMutation.isPending} disabled={!canSubmit}>
            Log Call
          </Button>
        </form>
      </Card>

      <FollowUpPrompt
        isOpen={showFollowUp}
        onClose={() => { setShowFollowUp(false); router.push('/numbers'); }}
        onSubmit={(data) => followUpMutation.mutate(data)}
        onNotInterested={() => notInterestedMutation.mutate()}
        notInterestedLoading={notInterestedMutation.isPending}
        onHotLead={() => hotLeadMutation.mutate()}
        hotLeadLoading={hotLeadMutation.isPending}
        clientPhoneNumber={lastCallPhone}
        loading={followUpMutation.isPending}
      />
    </div>
  );
}
