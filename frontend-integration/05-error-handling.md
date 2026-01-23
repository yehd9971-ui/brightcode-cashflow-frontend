# Error Handling Guide

> **Last Updated:** 2026-01-20 06:51 (Africa/Cairo)

Comprehensive guide to handling errors from the BrightCode Cashflow API in your React frontend.

## Table of Contents

- [Error Response Format](#error-response-format)
- [HTTP Status Codes](#http-status-codes)
- [Common Error Scenarios](#common-error-scenarios)
- [React Error Handling](#react-error-handling)
- [Validation Rules](#validation-rules)
- [Troubleshooting](#troubleshooting)

## Error Response Format

All API errors follow this consistent structure:

```typescript
interface ErrorResponse {
  statusCode: number;        // HTTP status code
  message: string;           // Human-readable error message
  errors?: ValidationError[]; // Optional validation errors (for 400)
  timestamp: string;         // ISO 8601 timestamp
  path: string;              // Request URL that failed
}

interface ValidationError {
  field: string;             // Field name (e.g., "validation", "email")
  message: string;           // Specific error message
}
```

### Example Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "email must be an email"
    },
    {
      "field": "validation",
      "message": "password must be longer than or equal to 8 characters"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/users"
}
```

## HTTP Status Codes

| Code | Meaning | When It Occurs | Frontend Action |
|------|---------|----------------|-----------------|
| **200** | OK | Request successful | Process response data |
| **201** | Created | Resource created successfully | Process new resource, show success message |
| **204** | No Content | Deletion successful (no response body) | Remove from UI, show success message |
| **400** | Bad Request | Validation failed, invalid input | Show validation errors to user |
| **401** | Unauthorized | Missing/invalid token, invalid credentials | Refresh token or redirect to login |
| **403** | Forbidden | Insufficient permissions, operation not allowed | Show "Access Denied" message |
| **404** | Not Found | Resource doesn't exist | Show "Not Found" message |
| **409** | Conflict | Email already registered, duplicate data | Show conflict error to user |
| **429** | Too Many Requests | Rate limit exceeded | Show "Too Many Requests" with retry timer |
| **500** | Internal Server Error | Unexpected server error | Show generic error, log to error tracking |

## Common Error Scenarios

### Authentication Errors (401)

#### Invalid Credentials
**Occurs:** Login with wrong email/password

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/auth/login"
}
```

**Solution:**
```typescript
if (error.statusCode === 401 && error.path.includes('/auth/login')) {
  setError('Invalid email or password. Please try again.');
}
```

#### Expired Access Token
**Occurs:** API request with expired token (after 15 minutes)

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions"
}
```

**Solution:**
```typescript
// Automatically handled by axios interceptor (refresh token)
// Or manually:
if (error.statusCode === 401) {
  await refreshAccessToken();
  // Retry original request
}
```

#### Invalid Refresh Token
**Occurs:** Refresh token expired or revoked

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/auth/refresh"
}
```

**Solution:**
```typescript
if (error.statusCode === 401 && error.path.includes('/auth/refresh')) {
  // Session expired, redirect to login
  clearTokens();
  navigate('/login');
  showNotification('Session expired. Please login again.');
}
```

#### Deactivated Account
**Occurs:** User account has been deactivated by admin

```json
{
  "statusCode": 401,
  "message": "User account is deactivated",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/auth/refresh"
}
```

**Solution:**
```typescript
if (error.message.includes('deactivated')) {
  showErrorDialog({
    title: 'Account Deactivated',
    message: 'Your account has been deactivated. Please contact your administrator.',
  });
  clearTokens();
  navigate('/login');
}
```

---

### Validation Errors (400)

#### Missing Required Fields
**Occurs:** Creating transaction without required fields

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "type should not be empty"
    },
    {
      "field": "validation",
      "message": "amount must be a number conforming to the specified constraints"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions"
}
```

**Solution:**
```typescript
function showValidationErrors(errors: ValidationError[]) {
  const errorMessages = errors.map(e => e.message).join('\n');
  setFormErrors(errorMessages);
}

if (error.statusCode === 400 && error.errors) {
  showValidationErrors(error.errors);
}
```

#### Invalid Email Format
**Occurs:** User creation with invalid email

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "email must be an email"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/users"
}
```

**Solution:**
```typescript
// Client-side validation before API call
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailPattern.test(email)) {
  setError('Please enter a valid email address');
  return;
}
```

#### Amount Validation
**Occurs:** Amount less than 0.01 or more than 2 decimal places

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "amount must not be less than 0.01"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions"
}
```

**Solution:**
```typescript
// Client-side validation
function validateAmount(amount: number): string | null {
  if (amount < 0.01) {
    return 'Amount must be at least 0.01 EGP';
  }
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return 'Amount cannot have more than 2 decimal places';
  }
  return null;
}
```

#### Delete Without Reason
**Occurs:** Deleting transaction without providing reason

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "validation",
      "message": "reason must be longer than or equal to 10 characters"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid"
}
```

**Solution:**
```typescript
// Enforce minimum length in UI
if (deleteReason.length < 10) {
  setError('Deletion reason must be at least 10 characters');
  return;
}
```

---

### Authorization Errors (403)

#### Insufficient Permissions
**Occurs:** SALES user trying to access ADMIN-only endpoint

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/users"
}
```

**Solution:**
```typescript
if (error.statusCode === 403) {
  showNotification({
    type: 'error',
    message: 'You do not have permission to perform this action.',
  });
  // Optionally redirect to safe page
  navigate('/dashboard');
}
```

#### Cannot Modify Approved Transaction
**Occurs:** Trying to edit APPROVED or REJECTED transaction

```json
{
  "statusCode": 403,
  "message": "Cannot modify approved transaction",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid"
}
```

**Solution:**
```typescript
// Hide edit button for approved/rejected transactions
{transaction.status === 'PENDING' && (
  <button onClick={handleEdit}>Edit</button>
)}

// Or show appropriate message
if (error.message.includes('approved transaction')) {
  showNotification({
    type: 'info',
    message: 'Approved transactions cannot be modified.',
  });
}
```

#### Cannot Access Other User's Data
**Occurs:** SALES user trying to view another SALES user's transaction

```json
{
  "statusCode": 403,
  "message": "Access denied",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid"
}
```

**Solution:**
```typescript
if (error.statusCode === 403 && error.message === 'Access denied') {
  showNotification({
    type: 'error',
    message: 'You can only access your own transactions.',
  });
  navigate('/my-transactions');
}
```

#### Maximum Attachments Reached
**Occurs:** Trying to upload more than 5 attachments

```json
{
  "statusCode": 403,
  "message": "Maximum 5 attachments per transaction",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid/attachments"
}
```

**Solution:**
```typescript
// Disable upload button when limit reached
const canUpload = transaction.attachments.length < 5;

<button disabled={!canUpload || transaction.status !== 'PENDING'}>
  {canUpload ? 'Upload Receipt' : 'Maximum 5 attachments'}
</button>
```

#### Cannot Delete Last Attachment
**Occurs:** Trying to delete the only remaining attachment on a transaction

```json
{
  "statusCode": 403,
  "message": "Cannot delete the last attachment. Each transaction must have at least one attachment.",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/attachments/uuid"
}
```

**Solution:**
```typescript
// Disable delete button when only one attachment remains
const canDelete = transaction.attachments.length > 1 && transaction.status === 'PENDING';

<button
  disabled={!canDelete}
  title={transaction.attachments.length <= 1 ? 'Cannot delete the last attachment' : ''}
>
  Delete
</button>

// Or handle the error
if (error.message.includes('last attachment')) {
  showNotification({
    type: 'warning',
    message: 'Each transaction must have at least one attachment.',
  });
}
```

---

### Resource Not Found (404)

#### Transaction Not Found
```json
{
  "statusCode": 404,
  "message": "Transaction not found",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/invalid-uuid"
}
```

**Solution:**
```typescript
if (error.statusCode === 404) {
  showNotification({
    type: 'error',
    message: 'Transaction not found. It may have been deleted.',
  });
  navigate('/transactions');
}
```

#### User Not Found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/users/invalid-uuid"
}
```

---

### Conflict Errors (409)

#### Email Already Registered
```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/users"
}
```

**Solution:**
```typescript
if (error.statusCode === 409 && error.message.includes('Email')) {
  setFieldError('email', 'This email is already registered');
}
```

---

### File Upload Errors (400)

#### Invalid File Type
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, and PDF are allowed",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid/attachments"
}
```

**Solution:**
```typescript
// Client-side validation before upload
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

function validateFile(file: File): string | null {
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, and PDF files are allowed';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be under 5MB';
  }
  return null;
}
```

#### File Too Large
```json
{
  "statusCode": 400,
  "message": "File size exceeds 5MB limit",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/transactions/uuid/attachments"
}
```

---

### Rate Limiting (429)

#### Too Many Login Attempts
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/auth/login"
}
```

**Solution:**
```typescript
if (error.statusCode === 429) {
  showNotification({
    type: 'warning',
    message: 'Too many login attempts. Please wait 60 seconds and try again.',
  });
  setIsLocked(true);
  setTimeout(() => setIsLocked(false), 60000); // Unlock after 60s
}
```

---

## React Error Handling

### Centralized Error Handler

```typescript
// utils/errorHandler.ts
import { ErrorResponse, ValidationError } from '../types/api';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: ValidationError[],
    public path?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new APIError(
      error.statusCode,
      error.message,
      error.errors,
      error.path
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    if (error.errors && error.errors.length > 0) {
      return error.errors.map(e => e.message).join(', ');
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
```

### Error Notification Hook

```typescript
// hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { toast } from 'react-toastify'; // or your notification library
import { APIError, getErrorMessage } from '../utils/errorHandler';

export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    const message = getErrorMessage(error);

    if (error instanceof APIError) {
      switch (error.statusCode) {
        case 400:
          toast.error(`Validation Error: ${message}`);
          break;
        case 401:
          if (error.path?.includes('/auth/login')) {
            toast.error('Invalid credentials');
          } else {
            toast.error('Session expired. Please login again.');
            // Redirect to login
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('Access Denied');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 409:
          toast.error(message);
          break;
        case 429:
          toast.warning('Too many requests. Please wait and try again.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          // Log to error tracking service
          console.error('Server error:', error);
          break;
        default:
          toast.error(message);
      }
    } else {
      toast.error(message);
    }
  }, []);

  return { handleError };
}
```

### Error Boundary Component

```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Form Error Display

```typescript
// components/FormError.tsx
import { ValidationError } from '../types/api';

interface FormErrorProps {
  errors?: ValidationError[];
  message?: string;
}

export function FormError({ errors, message }: FormErrorProps) {
  if (!errors && !message) return null;

  return (
    <div className="form-error" role="alert">
      {message && <p>{message}</p>}
      {errors && errors.length > 0 && (
        <ul>
          {errors.map((error, index) => (
            <li key={index}>{error.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Usage Example

```typescript
// components/CreateTransactionForm.tsx
import { useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { FormError } from './FormError';
import { createTransaction } from '../api/transactions';

export function CreateTransactionForm() {
  const [formData, setFormData] = useState({
    type: 'OUT' as const,
    amount: '',
    description: '',
  });
  const [error, setError] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const transaction = await createTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
      });

      toast.success(`Transaction ${transaction.transactionNumber} created!`);
      // Reset form or navigate
    } catch (err) {
      setError(err);
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormError errors={error?.errors} message={error?.message} />

      {/* Form fields... */}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Transaction'}
      </button>
    </form>
  );
}
```

## Validation Rules

### Client-Side Validation Reference

| Field | Rule | Message |
|-------|------|---------|
| **Email** | Valid email format | "Please enter a valid email address" |
| **Password** | Min 8 characters | "Password must be at least 8 characters" |
| **Amount** | Min 0.01 | "Amount must be at least 0.01 EGP" |
| **Amount** | Max 2 decimals | "Amount cannot have more than 2 decimal places" |
| **Description** | Max 500 chars | "Description cannot exceed 500 characters" |
| **Reason** | Min 10, Max 500 chars | "Reason must be between 10 and 500 characters" |
| **Page** | Min 1 | "Page must be at least 1" |
| **Limit** | Min 1, Max 100 | "Limit must be between 1 and 100" |
| **File Size** | Max 5MB | "File size must be under 5MB" |
| **File Type** | JPEG, PNG, PDF | "Only JPEG, PNG, and PDF files are allowed" |

## Troubleshooting

### Issue: Getting 401 on every request

**Possible Causes:**
1. Access token expired (15-minute lifetime)
2. Token not included in request headers
3. Token format incorrect (should be `Bearer <token>`)

**Solutions:**
```typescript
// Check token is included
const token = getAccessToken();
console.log('Token:', token ? 'Present' : 'Missing');

// Check header format
headers: {
  'Authorization': `Bearer ${token}`, // Correct
  // NOT: 'Authorization': token
}

// Implement auto-refresh
if (error.statusCode === 401) {
  await refreshAccessToken();
  // Retry request
}
```

### Issue: Validation errors not showing

**Possible Causes:**
1. Error response structure not matching expected format
2. Validation errors array empty
3. Error state not updating in React

**Solutions:**
```typescript
// Log error to inspect structure
console.log('Full error:', error);

// Check if errors array exists
if (error.errors && error.errors.length > 0) {
  setValidationErrors(error.errors);
}

// Force re-render
setError({ ...error }); // Create new object reference
```

### Issue: Rate limit errors persisting

**Possible Causes:**
1. Multiple login attempts in quick succession
2. Retry logic causing request loop

**Solutions:**
```typescript
// Add delay between retries
await new Promise(resolve => setTimeout(resolve, 1000));

// Check rate limit status
if (error.statusCode === 429) {
  // Wait 60 seconds before allowing retry
  setRetryAfter(Date.now() + 60000);
}
```

---

**Next:** Explore all API endpoints in detail in [API Reference →](./03-api-reference.md)
