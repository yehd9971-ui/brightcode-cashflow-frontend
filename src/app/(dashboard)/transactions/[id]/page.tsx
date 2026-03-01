'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Image,
  Edit,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactionById,
  approveTransaction,
  rejectTransaction,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
} from '@/lib/services/transactions';
import { TransactionStatus, validateFile, VALIDATION_RULES } from '@/types/api';
import { formatAmount, formatDate, formatFileSize } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { FullPageLoading } from '@/components/ui/Loading';
import { cn } from '@/utils/cn';

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transactionId = params.id as string;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeleteAttachmentConfirm, setShowDeleteAttachmentConfirm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const loadedImagesRef = useRef<Set<string>>(new Set());
  const blobUrlsRef = useRef<Record<string, string>>({}); // For cleanup only - refs persist across Strict Mode
  const blobsRef = useRef<Record<string, Blob>>({}); // Keep blob references to prevent garbage collection

  // Fetch transaction
  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ['transactions', transactionId],
    queryFn: () => getTransactionById(transactionId),
    enabled: !!transactionId,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => approveTransaction(transactionId),
    onSuccess: () => {
      toast.success('Transaction approved successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowApproveConfirm(false);
    },
    onError: () => {
      toast.error('Failed to approve transaction');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectTransaction(transactionId, { reason: rejectReason }),
    onSuccess: () => {
      toast.success('Transaction rejected');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject transaction');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(transactionId, file),
    onSuccess: () => {
      toast.success('Attachment uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
    },
    onError: () => {
      toast.error('Failed to upload attachment');
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => {
      toast.success('Attachment deleted');
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      setShowDeleteAttachmentConfirm(null);
    },
    onError: () => {
      toast.error('Failed to delete attachment');
    },
  });

  // Fetch image attachments with authentication
  useEffect(() => {
    // CRITICAL FIX: Wait for auth to be ready before fetching images
    if (!transaction?.attachments) return;
    if (authLoading) return; // Don't fetch while auth is initializing
    if (!isAuthenticated) return; // Don't fetch if not authenticated

    const fetchImages = async () => {
      const imageAttachments = transaction.attachments.filter((att) =>
        isImageFile(att.mimeType)
      );

      for (const attachment of imageAttachments) {
        // Skip if already loaded using ref
        if (loadedImagesRef.current.has(attachment.id)) continue;

        try {
          loadedImagesRef.current.add(attachment.id);
          setLoadingImages((prev) => ({ ...prev, [attachment.id]: true }));

          // Fetch with authentication (Bearer token included automatically)
          const blob = await downloadAttachment(attachment.id);

          // Validate blob size
          if (blob.size === 0) {
            throw new Error('Empty blob received from server');
          }

          // CRITICAL: Validate blob MIME type
          if (!blob.type) {
            throw new Error('Blob has no Content-Type. Backend may not be sending proper headers.');
          }

          if (!blob.type.startsWith('image/')) {
            // Blob is not an image - likely HTML error page or JSON response
            if (blob.type.startsWith('text/') || blob.type.includes('json')) {
              const text = await blob.text();
              throw new Error(`Server returned ${blob.type} instead of image. Content: ${text.substring(0, 100)}`);
            }
            throw new Error(`Invalid blob type: ${blob.type}. Expected image/*, got ${blob.type}`);
          }

          // CRITICAL: Store blob reference to prevent garbage collection
          // Without this, the blob may be GC'd before React renders the img tag
          blobsRef.current[attachment.id] = blob;

          const objectUrl = URL.createObjectURL(blob);

          // Store in ref for cleanup (refs persist across Strict Mode cycles)
          blobUrlsRef.current[attachment.id] = objectUrl;

          // Store in state for rendering
          setImageBlobUrls((prev) => ({ ...prev, [attachment.id]: objectUrl }));
        } catch (error: any) {

          // ENHANCEMENT: Show user-facing error
          if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error('Authentication error loading image. Please refresh the page.');
          } else {
            toast.error(`Failed to load image: ${attachment.originalFilename}`);
          }

          loadedImagesRef.current.delete(attachment.id); // Allow retry on error
        } finally {
          setLoadingImages((prev) => ({ ...prev, [attachment.id]: false }));
        }
      }
    };

    fetchImages();
    // CRITICAL FIX: Add auth dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.attachments, authLoading, isAuthenticated]);

  // Cleanup: Revoke object URLs on component unmount only
  // CRITICAL: Skip cleanup in development - Strict Mode double-invoke causes
  // URLs to be revoked while still needed. URLs are garbage collected on page unload anyway.
  useEffect(() => {
    return () => {
      // Only cleanup in production - dev mode has Strict Mode double-invoke issues
      // that revoke URLs before they can be rendered
      if (process.env.NODE_ENV === 'production') {
        Object.entries(blobUrlsRef.current).forEach(([, url]) => {
          if (url) {
            URL.revokeObjectURL(url);
          }
        });
        loadedImagesRef.current.clear();
        blobUrlsRef.current = {};
        blobsRef.current = {}; // Clear blob references to allow GC
        setImageBlobUrls({});
      }
      // In development: refs and state persist across Strict Mode cycles
      // preventing the "0 bytes" issue where URLs are revoked mid-render
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    uploadMutation.mutate(file);
    e.target.value = '';
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const blob = await downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download attachment');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-red-500" />;
  };

  const isImageFile = (mimeType: string) => {
    return ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'].includes(mimeType.toLowerCase());
  };

  if (isLoading) {
    return <FullPageLoading text="Loading transaction..." />;
  }

  if (error || !transaction) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Transaction not found
        </h2>
        <p className="text-gray-500 mb-4">
          The transaction you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/transactions">
          <Button>Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  const isPending = transaction.status === TransactionStatus.PENDING;
  const canApprove = isAdmin && isPending && transaction.attachments.length > 0;
  const canReject = isAdmin && isPending;
  const canUpload = isPending && transaction.attachments.length < 5;
  const canDeleteAttachment = isPending && transaction.attachments.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {transaction.transactionNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={transaction.status} />
              <TypeBadge type={transaction.type} />
            </div>
          </div>
        </div>

        {isAdmin && isPending && (
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Edit className="w-4 h-4 me-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Transaction Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="mt-1">
                  <TypeBadge type={transaction.type} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Amount</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatAmount(transaction.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Category</dt>
                <dd className="mt-1">
                  <Badge variant="neutral">{transaction.category}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={transaction.status} />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="mt-1 text-gray-900">{transaction.description}</dd>
              </div>
              {/* Customer Details */}
              {transaction.customerName && (
                <div>
                  <dt className="text-sm text-gray-500">Customer Name</dt>
                  <dd className="mt-1 text-gray-900">{transaction.customerName}</dd>
                </div>
              )}
              {transaction.phoneNumber && (
                <div>
                  <dt className="text-sm text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-gray-900">{transaction.phoneNumber}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Created By</dt>
                <dd className="mt-1 text-gray-900">{transaction.createdBy.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created At</dt>
                <dd className="mt-1 text-gray-900">
                  {formatDate(transaction.createdAt)}
                </dd>
              </div>
              {isAdmin && transaction.approvedBy && (
                <>
                  <div>
                    <dt className="text-sm text-gray-500">Approved By</dt>
                    <dd className="mt-1 text-gray-900">
                      {transaction.approvedBy.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Approved At</dt>
                    <dd className="mt-1 text-gray-900">
                      {transaction.approvedAt && formatDate(transaction.approvedAt)}
                    </dd>
                  </div>
                </>
              )}
              {transaction.rejectionReason && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-500">Rejection Reason</dt>
                  <dd className="mt-1">
                    <Alert type="error">{transaction.rejectionReason}</Alert>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Attachments */}
          <Card
            title={`Attachments (${transaction.attachments.length}/5)`}
            actions={
              canUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={VALIDATION_RULES.file.allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadMutation.isPending}
                  >
                    <Upload className="w-4 h-4 me-2" />
                    Upload
                  </Button>
                </>
              )
            }
          >
            {transaction.attachments.length === 0 ? (
              <Alert type="warning">
                No attachments yet. Upload at least one receipt before approval.
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {transaction.attachments.map((attachment) => {
                  const isImage = isImageFile(attachment.mimeType);
                  const blobUrl = imageBlobUrls[attachment.id];
                  const isLoadingImage = loadingImages[attachment.id];

                  return (
                    <div key={attachment.id} className="space-y-2">
                      {isImage && blobUrl ? (
                        /* Image Preview Mode */
                        <div className="relative group">
                          {/* Click-to-enlarge: Opens full image in new tab */}
                          <a
                            href={blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors cursor-pointer"
                          >
                            <div className="relative bg-gray-50">
                              <img
                                src={blobUrl}
                                alt={attachment.originalFilename}
                                className="w-full max-h-64 object-contain"
                                loading="lazy"
                              />
                              {/* Overlay hint on hover */}
                              <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg px-3 py-2 shadow-lg">
                                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                    Click to enlarge
                                  </p>
                                </div>
                              </div>
                            </div>
                          </a>

                          {/* Image Info & Actions */}
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {attachment.originalFilename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(attachment.size)} &middot;{' '}
                                  {formatDate(attachment.uploadedAt, 'en', 'MMM dd, HH:mm')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDownload(attachment.id, attachment.originalFilename)
                                }
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {canDeleteAttachment && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowDeleteAttachmentConfirm(attachment.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : isImage && isLoadingImage ? (
                        /* Image Loading State */
                        <div className="flex items-center justify-center p-8 border-2 border-gray-200 rounded-lg bg-gray-50">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
                            <p className="text-sm text-gray-500">Loading image...</p>
                          </div>
                        </div>
                      ) : (
                        /* Non-Image File Mode (PDF, etc.) */
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          {getFileIcon(attachment.mimeType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.originalFilename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)} &middot;{' '}
                              {formatDate(attachment.uploadedAt, 'en', 'MMM dd, HH:mm')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDownload(attachment.id, attachment.originalFilename)
                              }
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {canDeleteAttachment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteAttachmentConfirm(attachment.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Actions Sidebar */}
        {isAdmin && isPending && (
          <div className="space-y-4">
            <Card title="Actions">
              <div className="space-y-3">
                <Button
                  fullWidth
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={!canApprove}
                >
                  <CheckCircle className="w-4 h-4 me-2" />
                  Approve
                </Button>
                {!canApprove && transaction.attachments.length === 0 && (
                  <p className="text-xs text-yellow-600 text-center">
                    Upload at least one attachment to approve
                  </p>
                )}

                <Button
                  fullWidth
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                >
                  <XCircle className="w-4 h-4 me-2" />
                  Reject
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={() => approveMutation.mutate()}
        title="Approve Transaction"
        message={`Are you sure you want to approve transaction ${transaction.transactionNumber} for ${formatAmount(transaction.amount)}?`}
        confirmText="Approve"
        loading={approveMutation.isPending}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Transaction"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectReason.length < 10}
              loading={rejectMutation.isPending}
            >
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Rejection Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Provide a reason for rejection (minimum 10 characters)"
          maxLength={500}
          showCounter
          required
          error={
            rejectReason.length > 0 && rejectReason.length < 10
              ? 'Reason must be at least 10 characters'
              : undefined
          }
        />
      </Modal>

      {/* Delete Attachment Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteAttachmentConfirm}
        onClose={() => setShowDeleteAttachmentConfirm(null)}
        onConfirm={() => {
          if (showDeleteAttachmentConfirm) {
            deleteAttachmentMutation.mutate(showDeleteAttachmentConfirm);
          }
        }}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment?"
        confirmText="Delete"
        variant="danger"
        loading={deleteAttachmentMutation.isPending}
      />
    </div>
  );
}
