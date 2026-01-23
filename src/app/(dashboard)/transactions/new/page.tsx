'use client';

import { useState, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, FileText, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createTransaction, uploadAttachment } from '@/lib/services/transactions';
import {
  TransactionType,
  TransactionCategory,
  CreateTransactionDto,
  ErrorResponse,
  VALIDATION_RULES,
  validateFile,
} from '@/types/api';
import { formatFileSize } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';

const categoryOptions = Object.values(TransactionCategory).map((cat) => ({
  value: cat,
  label: cat.charAt(0) + cat.slice(1).toLowerCase(),
}));

export default function CreateTransactionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();

  const [formData, setFormData] = useState<CreateTransactionDto>({
    type: TransactionType.IN,
    amount: 0,
    description: '',
    category: TransactionCategory.OTHER,
    customerName: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Amount validation
    if (!formData.amount || formData.amount < VALIDATION_RULES.amount.min) {
      newErrors.amount = `Amount must be at least ${VALIDATION_RULES.amount.min} EGP`;
    } else {
      const decimalPlaces = (formData.amount.toString().split('.')[1] || '').length;
      if (decimalPlaces > VALIDATION_RULES.amount.decimalPlaces) {
        newErrors.amount = 'Amount cannot have more than 2 decimal places';
      }
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > VALIDATION_RULES.description.maxLength) {
      newErrors.description = `Description cannot exceed ${VALIDATION_RULES.description.maxLength} characters`;
    }

    // Customer name validation (optional but if provided, max 100 chars)
    if (formData.customerName && formData.customerName.length > VALIDATION_RULES.customerName.maxLength) {
      newErrors.customerName = `Customer name must be under ${VALIDATION_RULES.customerName.maxLength} characters`;
    }

    // Phone number validation (optional but if provided, must be valid format)
    if (formData.phoneNumber && !VALIDATION_RULES.phoneNumber.pattern.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // File validation
    if (selectedFiles.length === 0) {
      newErrors.files = 'At least one attachment is required';
      toast.error('Please select at least one file');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const transaction = await createTransaction(formData, selectedFiles, user?.role);

      // Success message
      const fileCount = selectedFiles.length;
      toast.success(
        `Transaction created with ${fileCount} ${fileCount === 1 ? 'attachment' : 'attachments'}!`
      );

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.push(`/transactions/${transaction.id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create transaction';
      toast.error(errorMessage);

      // Map validation errors if present
      if (error.response?.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData({ ...formData, amount: numValue });
    if (errors.amount) {
      setErrors({ ...errors, amount: '' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Enforce max 5 files
    if (selectedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
    if (errors.files) {
      setErrors({ ...errors, files: '' });
    }
    e.target.value = ''; // Reset input
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/transactions"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Transaction</h1>
          <p className="text-gray-500">Add a new income or expense</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: TransactionType.IN })}
                className={cn(
                  'flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-colors',
                  formData.type === TransactionType.IN
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="font-medium">IN (Income)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: TransactionType.OUT })}
                disabled={!isAdmin}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-4 border-2 rounded-lg transition-colors',
                  formData.type === TransactionType.OUT
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300',
                  !isAdmin && 'opacity-50 cursor-not-allowed hover:border-gray-200'
                )}
              >
                <span className="font-medium">OUT (Expense)</span>
                {!isAdmin && <span className="text-xs text-gray-500">(Admin only)</span>}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount (EGP) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                error={errors.amount}
                className="pe-16"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
                EGP
              </span>
            </div>
          </div>

          {/* Category */}
          <Select
            label="Category"
            options={categoryOptions}
            value={formData.category || TransactionCategory.OTHER}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value as TransactionCategory,
              })
            }
          />

          {/* Customer Name */}
          <Input
            label="Customer Name"
            placeholder="Enter customer name (optional)"
            value={formData.customerName || ''}
            onChange={(e) => {
              setFormData({ ...formData, customerName: e.target.value });
              if (errors.customerName) {
                setErrors({ ...errors, customerName: '' });
              }
            }}
            error={errors.customerName}
            maxLength={100}
          />

          {/* Phone Number */}
          <Input
            label="Phone Number"
            type="tel"
            placeholder="Enter phone number (optional)"
            value={formData.phoneNumber || ''}
            onChange={(e) => {
              setFormData({ ...formData, phoneNumber: e.target.value });
              if (errors.phoneNumber) {
                setErrors({ ...errors, phoneNumber: '' });
              }
            }}
            error={errors.phoneNumber}
            maxLength={20}
          />

          {/* Description */}
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (errors.description) {
                setErrors({ ...errors, description: '' });
              }
            }}
            placeholder="Enter transaction description..."
            maxLength={500}
            showCounter
            required
            error={errors.description}
            rows={4}
          />

          {/* File Attachments */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Attachments <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Upload receipts or supporting documents (Max 5 files, 5MB each, JPEG/PNG/PDF)
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedFiles.length >= 5}
            >
              <Upload className="w-4 h-4 me-2" />
              {selectedFiles.length >= 5 ? 'Maximum files reached' : 'Choose Files'}
            </Button>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  {selectedFiles.length} of 5 files selected
                </p>
              </div>
            )}

            {errors.files && (
              <p className="text-sm text-red-600">{errors.files}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href="/transactions">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || selectedFiles.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
