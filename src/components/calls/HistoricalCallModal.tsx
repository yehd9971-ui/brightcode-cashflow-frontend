'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Phone, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createHistoricalCall } from '@/lib/services/calls';
import { CallStatus, ErrorResponse, validateFile } from '@/types/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface HistoricalCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function egyptDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function apiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ErrorResponse>;
  return axiosError.response?.data?.message || 'Failed to submit historical call';
}

export function HistoricalCallModal({ isOpen, onClose }: HistoricalCallModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState('');
  const [callDate, setCallDate] = useState(() => egyptDateString(new Date()));
  const [callStartTime, setCallStartTime] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.ANSWERED);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [minDate] = useState(() => egyptDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [maxDate] = useState(() => egyptDateString(new Date()));
  const previewUrl = useMemo(
    () => (screenshot?.type.startsWith('image/') ? URL.createObjectURL(screenshot) : null),
    [screenshot],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const endPreview = useMemo(() => {
    const minutes = Number.parseInt(duration, 10);
    if (callStatus !== CallStatus.ANSWERED || !callDate || !callStartTime || !(minutes > 0)) {
      return null;
    }
    const start = new Date(`${callDate}T${callStartTime}:00.000Z`);
    const end = new Date(start.getTime() + minutes * 60_000);
    return end.toISOString().slice(0, 16).replace('T', ' ');
  }, [callDate, callStartTime, callStatus, duration]);

  const mutation = useMutation({
    mutationFn: () =>
      createHistoricalCall(
        {
          clientPhoneNumber: phone,
          callDate,
          callStartTime,
          callStatus,
          durationMinutes:
            callStatus === CallStatus.ANSWERED ? Number.parseInt(duration, 10) : undefined,
          notes: notes || undefined,
        },
        screenshot!,
      ),
    onSuccess: () => {
      toast.success('Historical call submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setPhone('');
      setCallStartTime('');
      setDuration('');
      setNotes('');
      setScreenshot(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const canSubmit = Boolean(
    phone.trim() &&
      callDate &&
      callStartTime &&
      screenshot &&
      (callStatus === CallStatus.NOT_ANSWERED ||
        (Number.parseInt(duration, 10) > 0 && notes.trim())),
  );

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }
    setScreenshot(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={mutation.isPending ? () => undefined : onClose}
      title="Add Historical Call"
      size="lg"
      closeOnOverlayClick={!mutation.isPending}
    >
      <form
        data-testid="historical-call-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) mutation.mutate();
        }}
      >
        <p className="text-sm text-gray-500">
          Record an outbound call made outside the system during the last 7 days. It will count
          after approval.
        </p>
        <Input
          id="historical-phone"
          name="clientPhoneNumber"
          label="Phone Number"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="01xxxxxxxxx"
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="historical-date"
            name="callDate"
            label="Call Date"
            type="date"
            value={callDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => setCallDate(event.target.value)}
            required
          />
          <Input
            id="historical-start-time"
            name="callStartTime"
            label="Start Time (Egypt)"
            type="time"
            value={callStartTime}
            onChange={(event) => setCallStartTime(event.target.value)}
            required
          />
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Call Status</span>
          <div className="flex gap-2">
            {[CallStatus.ANSWERED, CallStatus.NOT_ANSWERED].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setCallStatus(status)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  callStatus === status
                    ? status === CallStatus.ANSWERED
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Phone className="mr-1 inline h-4 w-4" />
                {status === CallStatus.ANSWERED ? 'Answered' : 'Not Answered'}
              </button>
            ))}
          </div>
        </div>
        {callStatus === CallStatus.ANSWERED ? (
          <>
            <Input
              id="historical-duration"
              name="durationMinutes"
              label="Actual Talk Duration (minutes)"
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
            {endPreview ? (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Calculated end: {endPreview} (Egypt time)
              </p>
            ) : null}
          </>
        ) : null}
        <Textarea
          id="historical-notes"
          name="notes"
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          required={callStatus === CallStatus.ANSWERED}
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Phone Log Screenshot <span className="text-red-500">*</span>
          </span>
          {screenshot ? (
            <div className="relative rounded-lg border bg-gray-50 p-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Phone log preview" className="max-h-56 w-full object-contain" />
              ) : (
                <p className="text-sm text-gray-600">{screenshot.name}</p>
              )}
              <button
                type="button"
                aria-label="Remove screenshot"
                className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-500 shadow"
                onClick={() => {
                  setScreenshot(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50"
            >
              <Upload className="h-6 w-6" />
              Upload phone log screenshot (required)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </div>
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!canSubmit}>
            Submit for Approval
          </Button>
        </div>
      </form>
    </Modal>
  );
}
