# Testing Plan: Bright Code Cashflow Dashboard

**Version:** 1.0
**Last Updated:** 2026-01-20
**Application:** Next.js Frontend for Bright Code Cashflow Management
**Based on:** FRONTEND_SPECIFICATION.md v1.0

---

## Table of Contents

1. [Data Accuracy Testing (Single Source of Truth)](#1-data-accuracy-testing-single-source-of-truth)
2. [Role-Based Access Control (RBAC) Testing](#2-role-based-access-control-rbac-testing)
3. [Validation Rules Testing](#3-validation-rules-testing)
4. [File Handling Testing](#4-file-handling-testing)
5. [Internationalization (i18n) Testing](#5-internationalization-i18n-testing)
6. [Edge Cases Testing](#6-edge-cases-testing)
7. [Test Data & Credentials](#7-test-data--credentials)
8. [Test Environment Setup](#8-test-environment-setup)
9. [Reporting & Bug Tracking](#9-reporting--bug-tracking)

---

## Testing Overview

This document provides a comprehensive testing plan for the Bright Code Cashflow Dashboard frontend application. It includes:

- **Manual QA Checklists**: Step-by-step test cases with checkboxes for tracking
- **Automation Roadmap**: Guidance for implementing automated tests using Playwright or Cypress
- **Priority Levels**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Test Data Requirements**: Sample data and credentials needed for testing

### Test Execution Priorities

- **P0 (Critical)**: Must pass before release. Blocks deployment.
- **P1 (High)**: Important functionality. Should pass before release.
- **P2 (Medium)**: Standard functionality. Should be tested but not blockers.
- **P3 (Low)**: Nice-to-have features. Can be deferred.

---

## 1. Data Accuracy Testing (Single Source of Truth)

**Objective**: Verify that all data displayed in the frontend matches the backend responses exactly, with special attention to monetary values (strings with 2 decimal places), dates (Africa/Cairo timezone), and transaction numbers.

### 1.1 Manual QA Checklist - Monetary Values

#### Test Case DA-001: Verify Amount Format in API Response (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Dashboard
  3. Open browser DevTools → Network tab
  4. Observe GET /reports/balance response
- [ ] **Expected Result**:
  - `totalIn`, `totalOut`, `netBalance` are strings (not numbers)
  - All amounts have exactly 2 decimal places (e.g., "45000.00", "1500.50")
- [ ] **Evidence**: Screenshot of Network tab showing JSON response

#### Test Case DA-002: Verify Amount Display Format (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Dashboard
  3. Check balance cards display
- [ ] **Expected Result**:
  - Amounts formatted as "X,XXX.XX EGP" (e.g., "45,000.00 EGP")
  - Commas for thousands separator
  - Exactly 2 decimal places always shown
- [ ] **Evidence**: Screenshot of dashboard

#### Test Case DA-003: Verify Transaction Amount Display (P1)
- [ ] **Steps**:
  1. Navigate to Transactions page
  2. Check amount column for multiple transactions
- [ ] **Expected Result**:
  - All amounts display with 2 decimals
  - Format: "X,XXX.XX EGP"
  - No rounding errors
- [ ] **Evidence**: Screenshot of transactions table

#### Test Case DA-004: Verify Balance Calculations (P0)
- [ ] **Steps**:
  1. Note totalIn and totalOut from API response
  2. Manually calculate: netBalance = totalIn - totalOut
  3. Compare with displayed netBalance
- [ ] **Expected Result**:
  - Calculation matches exactly (string precision)
  - No floating-point errors
- [ ] **Evidence**: API response + calculated values

#### Test Case DA-005: Verify Report Summary Calculations (P1)
- [ ] **Steps**:
  1. Navigate to Reports page
  2. Select date range (e.g., current month)
  3. Check period summary calculations
- [ ] **Expected Result**:
  - totalIn - totalOut = netCashflow
  - countIn + countOut = totalCount
  - All amounts are strings with 2 decimals
- [ ] **Evidence**: Screenshot + API response

#### Test Case DA-006: Verify Expenses by Category Total (P1)
- [ ] **Steps**:
  1. Navigate to Reports page
  2. Check "Expenses by Category" section
  3. Sum all category totals manually
- [ ] **Expected Result**:
  - Sum of categories = grandTotal
  - All amounts are strings with 2 decimals
- [ ] **Evidence**: Screenshot + manual calculation

### 1.2 Manual QA Checklist - Transaction Numbers

#### Test Case DA-007: Verify Transaction Number Format (P0)
- [ ] **Steps**:
  1. Create a new transaction
  2. Check the generated transaction number
- [ ] **Expected Result**:
  - Format: `BC-YYYY-NNNNNN` (e.g., BC-2024-000001)
  - Year matches current year
  - Number is zero-padded to 6 digits
- [ ] **Evidence**: Screenshot of transaction detail

#### Test Case DA-008: Verify Transaction Number Uniqueness (P1)
- [ ] **Steps**:
  1. Check multiple transactions in the system
  2. Verify no duplicate transaction numbers exist
- [ ] **Expected Result**:
  - All transaction numbers are unique
- [ ] **Evidence**: List of transaction numbers from API

#### Test Case DA-009: Verify Transaction Number in List View (P2)
- [ ] **Steps**:
  1. Navigate to Transactions page
  2. Check transaction number column
- [ ] **Expected Result**:
  - All entries show BC-YYYY-NNNNNN format
  - Numbers are clickable links to detail pages
- [ ] **Evidence**: Screenshot of transactions list

### 1.3 Manual QA Checklist - Dates & Timezone

#### Test Case DA-010: Verify Date Format in API Response (P0)
- [ ] **Steps**:
  1. Open DevTools Network tab
  2. Check any transaction GET response
  3. Observe `createdAt`, `updatedAt` fields
- [ ] **Expected Result**:
  - Dates are ISO 8601 strings (e.g., "2024-01-20T14:30:00.000Z")
- [ ] **Evidence**: Screenshot of Network tab

#### Test Case DA-011: Verify Date Display Format (P1)
- [ ] **Steps**:
  1. Navigate to Transactions page
  2. Check date column formatting
- [ ] **Expected Result**:
  - Dates formatted as "MMM DD, YYYY" (e.g., "Jan 20, 2024")
  - Time shown in transaction detail as "MMM DD, YYYY HH:mm"
- [ ] **Evidence**: Screenshot

#### Test Case DA-012: Verify Timezone Consistency (P1)
- [ ] **Steps**:
  1. Create a transaction at a known time
  2. Check createdAt timestamp in API response
  3. Verify displayed time matches Africa/Cairo timezone
- [ ] **Expected Result**:
  - Displayed time corresponds to Africa/Cairo (UTC+2)
- [ ] **Evidence**: Screenshot + server time comparison

#### Test Case DA-013: Verify Approved/Rejected Date Display (P2)
- [ ] **Steps**:
  1. Approve or reject a transaction
  2. Check detail page for approval/rejection timestamp
- [ ] **Expected Result**:
  - Timestamp shown in Africa/Cairo timezone
  - Format: "MMM DD, YYYY HH:mm"
- [ ] **Evidence**: Screenshot

### 1.4 Manual QA Checklist - Data Consistency Across Pages

#### Test Case DA-014: Verify Amount Consistency (P0)
- [ ] **Steps**:
  1. Note a transaction amount in list view
  2. Navigate to detail view for same transaction
  3. Check Reports page for same transaction
- [ ] **Expected Result**:
  - Amount displays identically across all pages
  - No rounding differences
- [ ] **Evidence**: Screenshots from all 3 pages

#### Test Case DA-015: Verify Status Consistency (P1)
- [ ] **Steps**:
  1. Check transaction status in list view
  2. Navigate to detail view
  3. Check Approvals page (if PENDING)
- [ ] **Expected Result**:
  - Status badge color and text identical everywhere
- [ ] **Evidence**: Screenshot

#### Test Case DA-016: Verify Creator Information Accuracy (P1)
- [ ] **Steps**:
  1. Login as SALES user, create transaction
  2. Logout, login as ADMIN
  3. Check transaction "Created By" field
- [ ] **Expected Result**:
  - Creator email matches SALES user email exactly
- [ ] **Evidence**: Screenshot

### 1.5 Automation Roadmap - Data Accuracy

**Framework**: Playwright (recommended) or Cypress

**Test Files Structure**:
```
tests/
  data-accuracy/
    monetary-values.spec.ts
    transaction-numbers.spec.ts
    dates-timezone.spec.ts
    data-consistency.spec.ts
```

**Key Automation Tests**:

```typescript
// Example: monetary-values.spec.ts
test('DA-001: Verify amount format in API response', async ({ page }) => {
  await page.goto('/');
  await login(page, 'admin@brightc0de.com', 'password');

  // Intercept API response
  const response = await page.waitForResponse('**/reports/balance');
  const data = await response.json();

  // Assertions
  expect(typeof data.totalIn).toBe('string');
  expect(data.totalIn).toMatch(/^\d+\.\d{2}$/);
  expect(typeof data.totalOut).toBe('string');
  expect(data.totalOut).toMatch(/^\d+\.\d{2}$/);
});

test('DA-004: Verify balance calculations', async ({ page }) => {
  const response = await page.waitForResponse('**/reports/balance');
  const data = await response.json();

  const totalIn = parseFloat(data.totalIn);
  const totalOut = parseFloat(data.totalOut);
  const expectedNet = (totalIn - totalOut).toFixed(2);

  expect(data.netBalance).toBe(expectedNet);
});
```

**API Mocking Strategy**:
- Mock backend responses with known test data
- Verify frontend correctly handles and displays string amounts
- Test edge cases: 0.00, 0.01, 9999999.99

**Assertions to Automate**:
- ✅ Type checking (string vs number)
- ✅ Decimal precision (always 2 places)
- ✅ Format regex matching (BC-YYYY-NNNNNN, ISO dates)
- ✅ Calculation accuracy
- ✅ Cross-page consistency

---

## 2. Role-Based Access Control (RBAC) Testing

**Objective**: Ensure SALES users cannot access ADMIN-only features, and that all role restrictions are properly enforced both in UI and via API guards.

### 2.1 Manual QA Checklist - SALES User Access

#### Test Case RBAC-001: SALES Cannot Access Approvals Page (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Attempt to navigate to `/approvals` directly via URL
- [ ] **Expected Result**:
  - Redirected to 403 Forbidden page
  - Or redirected to Dashboard with error message
- [ ] **Evidence**: Screenshot of 403 page

#### Test Case RBAC-002: SALES Cannot Access Reports Page (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Attempt to navigate to `/reports` directly via URL
- [ ] **Expected Result**:
  - 403 Forbidden page displayed
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-003: SALES Cannot Access Users Management (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Attempt to navigate to `/users` directly via URL
- [ ] **Expected Result**:
  - 403 Forbidden page displayed
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-004: SALES Cannot Access Audit Logs (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Attempt to navigate to `/audit` directly via URL
- [ ] **Expected Result**:
  - 403 Forbidden page displayed
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-005: SALES Navigation Menu Filters Admin Links (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Check sidebar navigation menu
- [ ] **Expected Result**:
  - Only visible: Dashboard, My Transactions
  - NOT visible: Approvals, Reports, Users, Audit Logs
- [ ] **Evidence**: Screenshot of sidebar

#### Test Case RBAC-006: SALES Can Only View Own Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN, note transaction IDs created by different users
  2. Logout, login as SALES user (different from creator)
  3. Navigate to Transactions page
  4. Check if other users' transactions appear
- [ ] **Expected Result**:
  - Only own transactions visible in list
  - Transaction count matches own transactions only
- [ ] **Evidence**: Screenshot + API response

#### Test Case RBAC-007: SALES Cannot View Other User's Transaction Detail (P0)
- [ ] **Steps**:
  1. Get transaction ID created by another SALES user (from ADMIN view)
  2. Login as different SALES user
  3. Navigate to `/transactions/{otherUserId}`
- [ ] **Expected Result**:
  - 403 Forbidden or "You don't have permission" message
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-008: SALES Cannot See Edit Button on Transactions (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to own PENDING transaction detail page
  3. Check for Edit button
- [ ] **Expected Result**:
  - No "Edit" button visible
  - Only "View" mode available
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-009: SALES Cannot See Delete Button (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to own transaction detail page
  3. Check for Delete button
- [ ] **Expected Result**:
  - No "Delete" button visible
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-010: SALES Cannot See Approve/Reject Buttons (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to own PENDING transaction detail page
  3. Check for Approve/Reject buttons
- [ ] **Expected Result**:
  - No "Approve" or "Reject" buttons visible
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-011: SALES Can Upload Attachments to Own PENDING Transactions (P1)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to own PENDING transaction
  3. Check for "Upload Receipt" button
  4. Attempt to upload a valid file
- [ ] **Expected Result**:
  - Upload button visible and functional
  - File uploads successfully
- [ ] **Evidence**: Screenshot of successful upload

#### Test Case RBAC-012: SALES Can Delete Attachments from Own PENDING Transactions (P1)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to own PENDING transaction with 2+ attachments
  3. Attempt to delete an attachment
- [ ] **Expected Result**:
  - Delete button visible and functional
  - Attachment deleted successfully
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-013: SALES Cannot Upload to Other User's Transactions (P0)
- [ ] **Steps**:
  1. Get transaction ID of another user's PENDING transaction
  2. Login as SALES user
  3. Try to access POST /transactions/{otherId}/attachments via API
- [ ] **Expected Result**:
  - 403 Forbidden from API
- [ ] **Evidence**: API response screenshot

### 2.2 Manual QA Checklist - ADMIN User Access

#### Test Case RBAC-014: ADMIN Can Access All Pages (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to each page: Dashboard, Transactions, Approvals, Reports, Users, Audit
- [ ] **Expected Result**:
  - All pages accessible without errors
- [ ] **Evidence**: Screenshots from each page

#### Test Case RBAC-015: ADMIN Navigation Shows All Links (P1)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Check sidebar navigation
- [ ] **Expected Result**:
  - Visible: Dashboard, Transactions, Approvals, Reports, Users, Audit Logs
- [ ] **Evidence**: Screenshot of sidebar

#### Test Case RBAC-016: ADMIN Can View All Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Transactions page
  3. Check "Created By" column
- [ ] **Expected Result**:
  - Transactions from all users visible
  - "Created By" column shows different user emails
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-017: ADMIN Can View Any User's Transaction Detail (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Select transaction created by SALES user
  3. Navigate to detail page
- [ ] **Expected Result**:
  - Detail page loads successfully
  - All information visible
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-018: ADMIN Can Edit PENDING Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to PENDING transaction detail
  3. Check for "Edit" button
  4. Click Edit, modify amount, save
- [ ] **Expected Result**:
  - Edit button visible
  - Edit modal opens
  - Changes saved successfully
- [ ] **Evidence**: Before/after screenshots

#### Test Case RBAC-019: ADMIN Cannot Edit APPROVED Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to APPROVED transaction detail
  3. Check for "Edit" button
- [ ] **Expected Result**:
  - No Edit button visible (status is immutable)
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-020: ADMIN Cannot Edit REJECTED Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to REJECTED transaction detail
  3. Check for "Edit" button
- [ ] **Expected Result**:
  - No Edit button visible
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-021: ADMIN Can Approve PENDING Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to PENDING transaction with attachments
  3. Click "Approve" button
  4. Confirm in modal
- [ ] **Expected Result**:
  - Transaction status changes to APPROVED
  - Approval timestamp recorded
  - Approved by: current admin user
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-022: ADMIN Can Reject PENDING Transactions (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to PENDING transaction
  3. Click "Reject" button
  4. Enter rejection reason (10-500 chars)
  5. Submit
- [ ] **Expected Result**:
  - Transaction status changes to REJECTED
  - Rejection reason displayed
  - Rejected by: current admin user
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-023: ADMIN Cannot Approve Transaction Without Attachments (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to PENDING transaction with 0 attachments
  3. Check "Approve" button state
- [ ] **Expected Result**:
  - Approve button disabled
  - Tooltip: "Upload at least one attachment"
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-024: ADMIN Can Delete Transactions (P1)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to transaction detail
  3. Click "Delete" button
  4. Enter deletion reason, confirm
- [ ] **Expected Result**:
  - Transaction soft-deleted
  - Redirected to transactions list
  - Success message shown
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-025: ADMIN Can Create Users (P0)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Users page
  3. Click "Create User"
  4. Fill form, submit
- [ ] **Expected Result**:
  - New user created successfully
  - Appears in users list
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-026: ADMIN Can Deactivate Users (P1)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Users page
  3. Click "Deactivate" on a user
  4. Confirm action
- [ ] **Expected Result**:
  - User status changes to Inactive
  - User cannot login anymore
- [ ] **Evidence**: Screenshot

#### Test Case RBAC-027: ADMIN Cannot Deactivate Own Account (P1)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Navigate to Users page
  3. Find own user row
  4. Check "Deactivate" button
- [ ] **Expected Result**:
  - Button disabled or not visible for own account
- [ ] **Evidence**: Screenshot

### 2.3 Manual QA Checklist - Role Enforcement Edge Cases

#### Test Case RBAC-028: API Rejects SALES Edit Attempt (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Get access token from localStorage/Network tab
  3. Use Postman/curl to call PATCH /transactions/{id}
- [ ] **Expected Result**:
  - 403 Forbidden response
  - Error message: "Insufficient permissions"
- [ ] **Evidence**: API response screenshot

#### Test Case RBAC-029: API Rejects SALES Approve Attempt (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Use API to call POST /transactions/{id}/approve
- [ ] **Expected Result**:
  - 403 Forbidden response
- [ ] **Evidence**: API response

#### Test Case RBAC-030: API Rejects SALES Access to Reports Endpoints (P0)
- [ ] **Steps**:
  1. Login as SALES user
  2. Use API to call GET /reports/balance
- [ ] **Expected Result**:
  - 403 Forbidden response
- [ ] **Evidence**: API response

#### Test Case RBAC-031: Role Persists Across Page Refresh (P1)
- [ ] **Steps**:
  1. Login as SALES user
  2. Navigate to Dashboard
  3. Refresh page (F5)
  4. Check sidebar navigation
- [ ] **Expected Result**:
  - Still logged in as SALES
  - Navigation menu still filters admin links
- [ ] **Evidence**: Screenshot after refresh

#### Test Case RBAC-032: Role Change Takes Effect Immediately (P2)
- [ ] **Steps**:
  1. Login as ADMIN
  2. Change a user's role from SALES to ADMIN
  3. In separate browser, that user refreshes page
- [ ] **Expected Result**:
  - User sees updated navigation menu
  - Can access new routes
- [ ] **Evidence**: Screenshot

### 2.4 Automation Roadmap - RBAC

**Framework**: Playwright with POM (Page Object Model)

**Test Files Structure**:
```
tests/
  rbac/
    sales-user-restrictions.spec.ts
    admin-user-access.spec.ts
    api-authorization.spec.ts
    edge-cases.spec.ts
```

**Page Objects**:
```typescript
// pages/LoginPage.ts
class LoginPage {
  async loginAsAdmin() { /* ... */ }
  async loginAsSales() { /* ... */ }
}

// pages/BasePage.ts
class BasePage {
  async checkSidebarLinks() { /* ... */ }
  async attemptNavigate(url: string) { /* ... */ }
}
```

**Key Automation Tests**:

```typescript
// Example: sales-user-restrictions.spec.ts
test.describe('SALES User Restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSales(page);
  });

  test('RBAC-001: Cannot access /approvals', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page).toHaveURL(/\/403|\/$/);
    await expect(page.locator('text=Forbidden')).toBeVisible();
  });

  test('RBAC-005: Sidebar filters admin links', async ({ page }) => {
    await expect(page.locator('nav >> text=Dashboard')).toBeVisible();
    await expect(page.locator('nav >> text=Transactions')).toBeVisible();
    await expect(page.locator('nav >> text=Approvals')).not.toBeVisible();
    await expect(page.locator('nav >> text=Reports')).not.toBeVisible();
    await expect(page.locator('nav >> text=Users')).not.toBeVisible();
  });

  test('RBAC-006: Can only view own transactions', async ({ page, request }) => {
    const response = await page.waitForResponse('**/transactions*');
    const data = await response.json();

    const currentUserEmail = await page.locator('[data-testid=user-email]').textContent();

    data.data.forEach(tx => {
      expect(tx.createdBy.email).toBe(currentUserEmail);
    });
  });
});
```

**API Authorization Tests**:
```typescript
// api-authorization.spec.ts
test('RBAC-028: API rejects SALES edit attempt', async ({ request }) => {
  const salesToken = await getSalesToken();

  const response = await request.patch('/api/transactions/1', {
    headers: { Authorization: `Bearer ${salesToken}` },
    data: { amount: 100 }
  });

  expect(response.status()).toBe(403);
});
```

**Test Data Requirements**:
- Pre-created ADMIN user
- Pre-created SALES user(s)
- Transactions owned by different users
- Known transaction IDs for cross-user access tests

---

## 3. Validation Rules Testing

**Objective**: Verify all client-side and server-side validation rules are correctly enforced for forms and inputs.

### 3.1 Manual QA Checklist - Transaction Validation

#### Test Case VAL-001: Amount Min Validation (P0)
- [ ] **Steps**:
  1. Navigate to Create Transaction page
  2. Enter amount: 0.00
  3. Attempt to submit
- [ ] **Expected Result**:
  - Error message: "Amount must be at least 0.01 EGP"
  - Form not submitted
- [ ] **Evidence**: Screenshot

#### Test Case VAL-002: Amount Max Decimal Places Validation (P0)
- [ ] **Steps**:
  1. Navigate to Create Transaction page
  2. Enter amount: 100.123 (3 decimals)
  3. Attempt to submit
- [ ] **Expected Result**:
  - Error message: "Amount cannot have more than 2 decimal places"
  - Form not submitted
- [ ] **Evidence**: Screenshot

#### Test Case VAL-003: Amount Max Value Validation (P1)
- [ ] **Steps**:
  1. Navigate to Create Transaction page
  2. Enter amount: 10000000.00 (exceeds max)
  3. Attempt to submit
- [ ] **Expected Result**:
  - Error message: "Amount cannot exceed 9,999,999.99 EGP"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-004: Amount Accepts Valid Values (P1)
- [ ] **Steps**:
  1. Navigate to Create Transaction page
  2. Enter amount: 0.01
  3. Submit form
- [ ] **Expected Result**:
  - Form submits successfully
  - Transaction created
- [ ] **Evidence**: Screenshot

#### Test Case VAL-005: Amount Accepts 2 Decimals (P1)
- [ ] **Steps**:
  1. Enter amount: 1500.50
  2. Submit
- [ ] **Expected Result**:
  - Accepted
- [ ] **Evidence**: Screenshot

#### Test Case VAL-006: Amount Accepts No Decimals (P2)
- [ ] **Steps**:
  1. Enter amount: 1500
  2. Submit
- [ ] **Expected Result**:
  - Accepted and stored as "1500.00"
- [ ] **Evidence**: API response

#### Test Case VAL-007: Description Required (P0)
- [ ] **Steps**:
  1. Create transaction form
  2. Leave description empty
  3. Submit
- [ ] **Expected Result**:
  - Error: "Description is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-008: Description Max Length (P0)
- [ ] **Steps**:
  1. Enter description with 501 characters
  2. Attempt to submit
- [ ] **Expected Result**:
  - Error: "Description cannot exceed 500 characters"
  - Character counter shows "501/500" in red
- [ ] **Evidence**: Screenshot

#### Test Case VAL-009: Description Character Counter (P2)
- [ ] **Steps**:
  1. Type in description field
  2. Observe character counter
- [ ] **Expected Result**:
  - Counter updates in real-time: "X/500"
  - Turns red when exceeds 500
- [ ] **Evidence**: Screenshot

#### Test Case VAL-010: Type Required (P0)
- [ ] **Steps**:
  1. Create transaction without selecting type
  2. Submit
- [ ] **Expected Result**:
  - Error: "Transaction type is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-011: Category Defaults to OTHER (P2)
- [ ] **Steps**:
  1. Create transaction without selecting category
  2. Check API request payload
- [ ] **Expected Result**:
  - Category defaults to "OTHER"
- [ ] **Evidence**: Network tab screenshot

### 3.2 Manual QA Checklist - User Validation

#### Test Case VAL-012: Email Format Validation (P0)
- [ ] **Steps**:
  1. Navigate to Create User page (ADMIN)
  2. Enter email: "invalid.email"
  3. Attempt to submit
- [ ] **Expected Result**:
  - Error: "Invalid email format"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-013: Email Required (P0)
- [ ] **Steps**:
  1. Create User form
  2. Leave email empty
  3. Submit
- [ ] **Expected Result**:
  - Error: "Email is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-014: Password Min Length (P0)
- [ ] **Steps**:
  1. Create User form
  2. Enter password: "1234567" (7 chars)
  3. Submit
- [ ] **Expected Result**:
  - Error: "Password must be at least 8 characters"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-015: Password Required on Create (P0)
- [ ] **Steps**:
  1. Create User form
  2. Leave password empty
  3. Submit
- [ ] **Expected Result**:
  - Error: "Password is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-016: Password Optional on Edit (P1)
- [ ] **Steps**:
  1. Edit User form
  2. Leave password field empty (placeholder: "Leave blank to keep current")
  3. Submit
- [ ] **Expected Result**:
  - Form submits successfully
  - Password unchanged
- [ ] **Evidence**: Screenshot

#### Test Case VAL-017: Email Uniqueness (P0)
- [ ] **Steps**:
  1. Attempt to create user with existing email
  2. Submit
- [ ] **Expected Result**:
  - Error: "Email already registered" (409 Conflict)
- [ ] **Evidence**: Screenshot

#### Test Case VAL-018: Role Required (P0)
- [ ] **Steps**:
  1. Create User without selecting role
  2. Submit
- [ ] **Expected Result**:
  - Error: "Role is required"
- [ ] **Evidence**: Screenshot

### 3.3 Manual QA Checklist - Rejection Reason Validation

#### Test Case VAL-019: Rejection Reason Min Length (P0)
- [ ] **Steps**:
  1. Navigate to PENDING transaction
  2. Click "Reject"
  3. Enter reason: "Too short" (9 chars)
  4. Attempt to submit
- [ ] **Expected Result**:
  - Submit button disabled
  - Error: "Reason must be at least 10 characters"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-020: Rejection Reason Max Length (P0)
- [ ] **Steps**:
  1. Reject transaction modal
  2. Enter 501 characters
  3. Attempt to submit
- [ ] **Expected Result**:
  - Error: "Reason cannot exceed 500 characters"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-021: Rejection Reason Character Counter (P2)
- [ ] **Steps**:
  1. Open rejection modal
  2. Type in reason field
- [ ] **Expected Result**:
  - Counter shows "X/500"
  - Turns red if exceeds 500
- [ ] **Evidence**: Screenshot

#### Test Case VAL-022: Rejection Reason Required (P0)
- [ ] **Steps**:
  1. Reject transaction modal
  2. Leave reason empty
  3. Attempt to submit
- [ ] **Expected Result**:
  - Submit button disabled
  - Error: "Rejection reason is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-023: Deletion Reason Validation (P1)
- [ ] **Steps**:
  1. Delete transaction
  2. Enter reason with 9 characters
  3. Attempt to submit
- [ ] **Expected Result**:
  - Same validation as rejection (10-500 chars)
- [ ] **Evidence**: Screenshot

### 3.4 Manual QA Checklist - Login Validation

#### Test Case VAL-024: Login Email Format (P0)
- [ ] **Steps**:
  1. Login page
  2. Enter email: "notanemail"
  3. Attempt to login
- [ ] **Expected Result**:
  - Error: "Invalid email format"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-025: Login Email Required (P0)
- [ ] **Steps**:
  1. Login page
  2. Leave email empty
  3. Enter password
  4. Submit
- [ ] **Expected Result**:
  - Error: "Email is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-026: Login Password Required (P0)
- [ ] **Steps**:
  1. Login page
  2. Enter email
  3. Leave password empty
  4. Submit
- [ ] **Expected Result**:
  - Error: "Password is required"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-027: Invalid Credentials Error (P0)
- [ ] **Steps**:
  1. Login with wrong password
  2. Submit
- [ ] **Expected Result**:
  - Error: "Invalid email or password" (401)
- [ ] **Evidence**: Screenshot

#### Test Case VAL-028: Deactivated User Error (P0)
- [ ] **Steps**:
  1. Login with deactivated user credentials
  2. Submit
- [ ] **Expected Result**:
  - Error: "Your account has been deactivated. Contact administrator."
- [ ] **Evidence**: Screenshot

### 3.5 Manual QA Checklist - Report Filters Validation

#### Test Case VAL-029: Date Range Validation (P1)
- [ ] **Steps**:
  1. Reports page
  2. Set "From Date" = 2024-01-20
  3. Set "To Date" = 2024-01-10 (before from date)
  4. Click "Generate"
- [ ] **Expected Result**:
  - Error: "End date must be after start date"
- [ ] **Evidence**: Screenshot

#### Test Case VAL-030: Pagination Limit Validation (P2)
- [ ] **Steps**:
  1. Transactions page
  2. Check pagination limit dropdown
- [ ] **Expected Result**:
  - Options: 10, 20, 50, 100 only
  - No manual input allowed
- [ ] **Evidence**: Screenshot

### 3.6 Automation Roadmap - Validation Rules

**Test Files Structure**:
```
tests/
  validation/
    transaction-validation.spec.ts
    user-validation.spec.ts
    rejection-validation.spec.ts
    login-validation.spec.ts
```

**Key Automation Tests**:

```typescript
// Example: transaction-validation.spec.ts
test.describe('Transaction Amount Validation', () => {
  test('VAL-001: Rejects amount below minimum', async ({ page }) => {
    await page.goto('/transactions/new');
    await page.fill('[name=amount]', '0.00');
    await page.click('button[type=submit]');

    await expect(page.locator('text=Amount must be at least 0.01')).toBeVisible();
  });

  test('VAL-002: Rejects more than 2 decimals', async ({ page }) => {
    await page.fill('[name=amount]', '100.123');
    await page.click('button[type=submit]');

    await expect(page.locator('text=cannot have more than 2 decimal places')).toBeVisible();
  });

  const validAmounts = ['0.01', '100', '100.50', '9999999.99'];
  for (const amount of validAmounts) {
    test(`Accepts valid amount: ${amount}`, async ({ page }) => {
      await page.fill('[name=amount]', amount);
      // Should not show error
      await expect(page.locator('.error-message')).not.toBeVisible();
    });
  }
});

// Character counter automation
test('VAL-009: Description character counter', async ({ page }) => {
  await page.goto('/transactions/new');
  const description = 'A'.repeat(250);

  await page.fill('[name=description]', description);
  await expect(page.locator('[data-testid=char-counter]')).toHaveText('250/500');

  await page.fill('[name=description]', 'A'.repeat(501));
  await expect(page.locator('[data-testid=char-counter]')).toHaveClass(/text-red/);
});
```

**Validation Test Matrix** (to automate):

| Field | Test Case | Input | Expected |
|-------|-----------|-------|----------|
| Amount | Min | 0.00 | Error |
| Amount | Min | 0.01 | Success |
| Amount | Max decimals | 100.123 | Error |
| Amount | Max decimals | 100.12 | Success |
| Description | Required | "" | Error |
| Description | Max length | 501 chars | Error |
| Email | Format | "invalid" | Error |
| Email | Format | "test@example.com" | Success |
| Password | Min length | "1234567" | Error |
| Password | Min length | "12345678" | Success |
| Reason | Min length | "short" | Error |
| Reason | Max length | 501 chars | Error |

**API Validation Tests**:
```typescript
test('API also validates amount', async ({ request }) => {
  const response = await request.post('/api/transactions', {
    data: { type: 'OUT', amount: 0.00, description: 'Test' }
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.errors).toContainEqual({
    field: 'amount',
    message: expect.stringContaining('0.01')
  });
});
```

---

## 4. File Handling Testing

**Objective**: Verify file upload validation (5MB limit, allowed types) and attachment business rules (min 1, max 5, cannot delete last).

### 4.1 Manual QA Checklist - File Upload Validation

#### Test Case FILE-001: 5MB Limit Enforced (P0)
- [ ] **Steps**:
  1. Navigate to transaction detail with < 5 attachments
  2. Click "Upload Receipt"
  3. Select file larger than 5MB (5,242,881 bytes)
- [ ] **Expected Result**:
  - Error toast: "File size must be under 5MB"
  - File not uploaded
- [ ] **Evidence**: Screenshot + file size info

#### Test Case FILE-002: 5MB Limit Accepts Exact 5MB (P1)
- [ ] **Steps**:
  1. Upload file exactly 5,242,880 bytes (5MB)
- [ ] **Expected Result**:
  - File uploads successfully
- [ ] **Evidence**: Screenshot

#### Test Case FILE-003: File Type Validation - Invalid Type (P0)
- [ ] **Steps**:
  1. Attempt to upload .docx file
- [ ] **Expected Result**:
  - Error: "Only JPEG, PNG, and PDF files are allowed"
- [ ] **Evidence**: Screenshot

#### Test Case FILE-004: File Type Validation - JPEG Accepted (P1)
- [ ] **Steps**:
  1. Upload .jpg file
- [ ] **Expected Result**:
  - Accepted and uploaded
- [ ] **Evidence**: Screenshot

#### Test Case FILE-005: File Type Validation - PNG Accepted (P1)
- [ ] **Steps**:
  1. Upload .png file
- [ ] **Expected Result**:
  - Accepted
- [ ] **Evidence**: Screenshot

#### Test Case FILE-006: File Type Validation - PDF Accepted (P1)
- [ ] **Steps**:
  1. Upload .pdf file
- [ ] **Expected Result**:
  - Accepted
- [ ] **Evidence**: Screenshot

#### Test Case FILE-007: MIME Type Validation (P1)
- [ ] **Steps**:
  1. Rename .txt file to .jpg
  2. Attempt to upload
- [ ] **Expected Result**:
  - Backend rejects based on MIME type
  - Error message shown
- [ ] **Evidence**: Network tab + error screenshot

### 4.2 Manual QA Checklist - Attachment Count Rules

#### Test Case FILE-008: Max 5 Attachments Enforced (P0)
- [ ] **Steps**:
  1. Upload 5 attachments to a transaction
  2. Check "Upload Receipt" button state
- [ ] **Expected Result**:
  - Button disabled
  - Tooltip: "Maximum 5 attachments reached"
- [ ] **Evidence**: Screenshot

#### Test Case FILE-009: Min 1 Attachment for Approval (P0)
- [ ] **Steps**:
  1. Navigate to PENDING transaction with 0 attachments
  2. As ADMIN, check "Approve" button state
- [ ] **Expected Result**:
  - Approve button disabled
  - Tooltip: "Upload at least one attachment to approve"
- [ ] **Evidence**: Screenshot

#### Test Case FILE-010: Cannot Delete Last Attachment (P0)
- [ ] **Steps**:
  1. Navigate to transaction with exactly 1 attachment
  2. Check "Delete" button on attachment
- [ ] **Expected Result**:
  - Delete button disabled
  - Tooltip: "Cannot delete the last attachment"
- [ ] **Evidence**: Screenshot

#### Test Case FILE-011: Can Delete When > 1 Attachment (P1)
- [ ] **Steps**:
  1. Transaction with 2+ attachments
  2. Delete one attachment
- [ ] **Expected Result**:
  - Delete succeeds
  - Attachment count decreases
- [ ] **Evidence**: Screenshot

#### Test Case FILE-012: Upload Disabled on APPROVED Transaction (P0)
- [ ] **Steps**:
  1. Navigate to APPROVED transaction
  2. Check for "Upload Receipt" button
- [ ] **Expected Result**:
  - Button not visible (status is immutable)
- [ ] **Evidence**: Screenshot

#### Test Case FILE-013: Upload Disabled on REJECTED Transaction (P0)
- [ ] **Steps**:
  1. Navigate to REJECTED transaction
  2. Check for "Upload Receipt" button
- [ ] **Expected Result**:
  - Button not visible
- [ ] **Evidence**: Screenshot

#### Test Case FILE-014: Delete Disabled on APPROVED Transaction (P0)
- [ ] **Steps**:
  1. Navigate to APPROVED transaction with attachments
  2. Check attachment delete buttons
- [ ] **Expected Result**:
  - No delete buttons visible
- [ ] **Evidence**: Screenshot

### 4.3 Manual QA Checklist - File Display & Download

#### Test Case FILE-015: Attachment Card Display (P2)
- [ ] **Steps**:
  1. View transaction with attachments
  2. Check attachment card information
- [ ] **Expected Result**:
  - Shows: filename, file size, upload date
  - Icon: image icon for JPEG/PNG, document icon for PDF
- [ ] **Evidence**: Screenshot

#### Test Case FILE-016: File Download Works (P1)
- [ ] **Steps**:
  1. Click "View" or attachment filename
  2. Check browser downloads
- [ ] **Expected Result**:
  - File downloads/opens in new tab
  - File is intact and viewable
- [ ] **Evidence**: Download confirmation

#### Test Case FILE-017: File Size Display Format (P3)
- [ ] **Steps**:
  1. Upload files of various sizes
  2. Check displayed file size
- [ ] **Expected Result**:
  - Displayed as KB or MB (e.g., "1.2 MB", "850 KB")
- [ ] **Evidence**: Screenshot

### 4.4 Manual QA Checklist - Upload Progress & Error Handling

#### Test Case FILE-018: Upload Progress Indicator (P2)
- [ ] **Steps**:
  1. Upload a large file (near 5MB)
  2. Observe upload process
- [ ] **Expected Result**:
  - Progress bar or spinner shown
  - "Uploading..." text displayed
- [ ] **Evidence**: Screenshot (mid-upload)

#### Test Case FILE-019: Upload Success Feedback (P2)
- [ ] **Steps**:
  1. Upload file successfully
- [ ] **Expected Result**:
  - Success toast: "Attachment uploaded successfully"
  - File appears in attachment list
- [ ] **Evidence**: Screenshot

#### Test Case FILE-020: Upload Network Error Handling (P1)
- [ ] **Steps**:
  1. Disconnect internet
  2. Attempt to upload file
- [ ] **Expected Result**:
  - Error toast: "Upload failed. Please check your connection."
- [ ] **Evidence**: Screenshot

#### Test Case FILE-021: Delete Confirmation Modal (P2)
- [ ] **Steps**:
  1. Click delete on attachment (when > 1)
- [ ] **Expected Result**:
  - Confirmation modal: "Are you sure you want to delete this attachment?"
  - Cancel and Confirm buttons
- [ ] **Evidence**: Screenshot

#### Test Case FILE-022: Delete Success Feedback (P2)
- [ ] **Steps**:
  1. Confirm attachment deletion
- [ ] **Expected Result**:
  - Success toast: "Attachment deleted successfully"
  - Attachment removed from list
- [ ] **Evidence**: Screenshot

### 4.5 Automation Roadmap - File Handling

**Test Files Structure**:
```
tests/
  file-handling/
    upload-validation.spec.ts
    attachment-rules.spec.ts
    file-display.spec.ts
```

**Test File Fixtures**:
```typescript
// fixtures/test-files.ts
export const testFiles = {
  validJpeg: 'fixtures/valid-image.jpg',    // < 5MB
  validPng: 'fixtures/valid-image.png',     // < 5MB
  validPdf: 'fixtures/valid-document.pdf',  // < 5MB
  oversizedFile: 'fixtures/large-file.jpg', // > 5MB
  invalidType: 'fixtures/document.docx',    // Not allowed
  exactlyFiveMB: 'fixtures/exactly-5mb.jpg' // Exactly 5,242,880 bytes
};
```

**Key Automation Tests**:

```typescript
// upload-validation.spec.ts
test('FILE-001: Rejects file > 5MB', async ({ page }) => {
  await page.goto('/transactions/1');

  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles(testFiles.oversizedFile);

  await expect(page.locator('text=File size must be under 5MB')).toBeVisible();

  // Verify file not uploaded
  const response = await page.waitForResponse('**/attachments', { timeout: 1000 })
    .catch(() => null);
  expect(response).toBeNull();
});

test('FILE-003: Rejects invalid file type', async ({ page }) => {
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles(testFiles.invalidType);

  await expect(page.locator('text=Only JPEG, PNG, and PDF files are allowed')).toBeVisible();
});

test('FILE-004-006: Accepts valid file types', async ({ page }) => {
  for (const file of [testFiles.validJpeg, testFiles.validPng, testFiles.validPdf]) {
    await page.locator('input[type=file]').setInputFiles(file);
    await expect(page.locator('text=Attachment uploaded successfully')).toBeVisible();
  }
});

// attachment-rules.spec.ts
test('FILE-008: Upload disabled at 5 attachments', async ({ page }) => {
  // Assuming transaction already has 5 attachments
  await page.goto('/transactions/1');

  const uploadButton = page.locator('button:has-text("Upload Receipt")');
  await expect(uploadButton).toBeDisabled();

  // Check tooltip
  await uploadButton.hover();
  await expect(page.locator('text=Maximum 5 attachments reached')).toBeVisible();
});

test('FILE-010: Cannot delete last attachment', async ({ page }) => {
  // Navigate to transaction with exactly 1 attachment
  await page.goto('/transactions/2');

  const deleteButton = page.locator('[data-testid=delete-attachment]');
  await expect(deleteButton).toBeDisabled();

  await deleteButton.hover();
  await expect(page.locator('text=Cannot delete the last attachment')).toBeVisible();
});

test('FILE-009: Approve disabled without attachments', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/transactions/3'); // Transaction with 0 attachments

  const approveButton = page.locator('button:has-text("Approve")');
  await expect(approveButton).toBeDisabled();
});
```

**File Size Test Helper**:
```typescript
// Generate test files of specific sizes
async function generateTestFile(sizeInBytes: number, filename: string) {
  const buffer = Buffer.alloc(sizeInBytes);
  await fs.writeFile(`fixtures/${filename}`, buffer);
}

// Setup
await generateTestFile(5242880, 'exactly-5mb.jpg');     // Exactly 5MB
await generateTestFile(5242881, 'just-over-5mb.jpg');   // 5MB + 1 byte
```

**API Integration Tests**:
```typescript
test('Backend enforces 5MB limit', async ({ request }) => {
  const oversizedFile = await fs.readFile(testFiles.oversizedFile);

  const formData = new FormData();
  formData.append('file', oversizedFile, 'large.jpg');

  const response = await request.post('/api/transactions/1/attachments', {
    multipart: formData
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.message).toContain('5MB');
});
```

---

## 5. Internationalization (i18n) Testing

**Objective**: Verify language switching works correctly, RTL/LTR layouts adapt properly, all UI text is translated, and currency/date formatting respects locale.

### 5.1 Manual QA Checklist - Language Switching

#### Test Case I18N-001: Language Toggle Button Exists (P0)
- [ ] **Steps**:
  1. Login to application
  2. Check navbar for language toggle
- [ ] **Expected Result**:
  - Button visible with globe icon
  - Shows opposite language (EN shows "العربية", AR shows "English")
- [ ] **Evidence**: Screenshot

#### Test Case I18N-002: Switch to Arabic (P0)
- [ ] **Steps**:
  1. Login (default English)
  2. Click language toggle
  3. Observe page changes
- [ ] **Expected Result**:
  - Page reloads or re-renders
  - All UI text now in Arabic
  - Layout switches to RTL
- [ ] **Evidence**: Screenshot

#### Test Case I18N-003: Switch Back to English (P0)
- [ ] **Steps**:
  1. From Arabic, click language toggle
- [ ] **Expected Result**:
  - Page switches to English
  - Layout switches to LTR
- [ ] **Evidence**: Screenshot

#### Test Case I18N-004: Language Persists on Refresh (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Refresh page (F5)
- [ ] **Expected Result**:
  - Still displays in Arabic
  - RTL layout maintained
- [ ] **Evidence**: Screenshot after refresh

#### Test Case I18N-005: Language Persists Across Navigation (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Navigate to different pages (Dashboard → Transactions → Reports)
- [ ] **Expected Result**:
  - Arabic maintained across all pages
- [ ] **Evidence**: Screenshots from different pages

### 5.2 Manual QA Checklist - RTL/LTR Layout

#### Test Case I18N-006: RTL Layout for Arabic (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check sidebar position
  3. Check text alignment
- [ ] **Expected Result**:
  - Sidebar on right side
  - Text aligned right
  - Icons mirrored appropriately
  - document.dir = "rtl"
- [ ] **Evidence**: Screenshot + DevTools HTML element

#### Test Case I18N-007: LTR Layout for English (P0)
- [ ] **Steps**:
  1. Switch to English
  2. Check sidebar position
  3. Check text alignment
- [ ] **Expected Result**:
  - Sidebar on left side
  - Text aligned left
  - document.dir = "ltr"
- [ ] **Evidence**: Screenshot

#### Test Case I18N-008: Tables Layout in RTL (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Navigate to Transactions page
  3. Check table alignment
- [ ] **Expected Result**:
  - Table columns read right-to-left
  - First column on right side
  - Action buttons on left side
- [ ] **Evidence**: Screenshot

#### Test Case I18N-009: Forms Layout in RTL (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Open Create Transaction form
  3. Check form field alignment
- [ ] **Expected Result**:
  - Labels aligned right
  - Input fields aligned right
  - Buttons positioned appropriately
- [ ] **Evidence**: Screenshot

#### Test Case I18N-010: Modals Layout in RTL (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Open rejection modal
- [ ] **Expected Result**:
  - Modal header and content RTL
  - Close button on left (instead of right)
- [ ] **Evidence**: Screenshot

#### Test Case I18N-011: Charts and Graphs in RTL (P2)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Navigate to Reports page
  3. Check chart axis and labels
- [ ] **Expected Result**:
  - Chart readable in RTL
  - Labels in Arabic
  - Axis appropriately positioned
- [ ] **Evidence**: Screenshot

### 5.3 Manual QA Checklist - Translation Completeness

#### Test Case I18N-012: Navigation Menu Translated (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check all sidebar links
- [ ] **Expected Result**:
  - Dashboard → "لوحة التحكم"
  - Transactions → "المعاملات"
  - Approvals → "الموافقات"
  - Reports → "التقارير"
  - Users → "المستخدمون"
  - Audit Logs → "سجلات التدقيق"
- [ ] **Evidence**: Screenshot

#### Test Case I18N-013: Login Page Translated (P0)
- [ ] **Steps**:
  1. Logout
  2. Switch to Arabic on login page
- [ ] **Expected Result**:
  - "Email" → "البريد الإلكتروني"
  - "Password" → "كلمة المرور"
  - "Login" → "تسجيل الدخول"
- [ ] **Evidence**: Screenshot

#### Test Case I18N-014: Transaction Statuses Translated (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check transaction status badges
- [ ] **Expected Result**:
  - PENDING → "قيد الانتظار"
  - APPROVED → "موافق عليه"
  - REJECTED → "مرفوض"
- [ ] **Evidence**: Screenshot

#### Test Case I18N-015: Transaction Types Translated (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check type badges
- [ ] **Expected Result**:
  - IN → "إيراد"
  - OUT → "مصروف"
- [ ] **Evidence**: Screenshot

#### Test Case I18N-016: Categories Translated (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check category dropdown in Create Transaction
- [ ] **Expected Result**:
  - All 8 categories translated (WEBSITES, DESIGN, MARKETING, etc.)
- [ ] **Evidence**: Screenshot

#### Test Case I18N-017: Validation Messages Translated (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Trigger validation error (e.g., empty amount)
- [ ] **Expected Result**:
  - Error message displayed in Arabic
- [ ] **Evidence**: Screenshot

#### Test Case I18N-018: Success Messages Translated (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Perform action (e.g., create transaction)
- [ ] **Expected Result**:
  - Success toast in Arabic
- [ ] **Evidence**: Screenshot

#### Test Case I18N-019: Button Labels Translated (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check common buttons (Save, Cancel, Edit, Delete, etc.)
- [ ] **Expected Result**:
  - All buttons translated
- [ ] **Evidence**: Screenshot

#### Test Case I18N-020: Table Headers Translated (P1)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check Transactions table headers
- [ ] **Expected Result**:
  - All column headers in Arabic
- [ ] **Evidence**: Screenshot

#### Test Case I18N-021: Pagination Translated (P2)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check pagination text
- [ ] **Expected Result**:
  - "Showing X-Y of Z" translated
  - "Previous" / "Next" translated
- [ ] **Evidence**: Screenshot

#### Test Case I18N-022: Empty States Translated (P2)
- [ ] **Steps**:
  1. Switch to Arabic
  2. View empty state (e.g., no transactions)
- [ ] **Expected Result**:
  - Empty state message in Arabic
- [ ] **Evidence**: Screenshot

### 5.4 Manual QA Checklist - Currency & Number Formatting

#### Test Case I18N-023: Currency Symbol in English (P0)
- [ ] **Steps**:
  1. Switch to English
  2. Check amount displays
- [ ] **Expected Result**:
  - Currency: "EGP" (e.g., "1,500.50 EGP")
- [ ] **Evidence**: Screenshot

#### Test Case I18N-024: Currency Symbol in Arabic (P0)
- [ ] **Steps**:
  1. Switch to Arabic
  2. Check amount displays
- [ ] **Expected Result**:
  - Currency: "ج.م" (e.g., "1,500.50 ج.م")
- [ ] **Evidence**: Screenshot

#### Test Case I18N-025: Number Formatting in English (P1)
- [ ] **Steps**:
  1. English mode
  2. Check large amounts (e.g., 1000000.00)
- [ ] **Expected Result**:
  - Format: "1,000,000.00" (comma as thousands separator)
- [ ] **Evidence**: Screenshot

#### Test Case I18N-026: Number Formatting in Arabic (P1)
- [ ] **Steps**:
  1. Arabic mode
  2. Check large amounts
- [ ] **Expected Result**:
  - Format: "1,000,000.00" (may use Arabic-Indic numerals or Western numerals based on locale)
- [ ] **Evidence**: Screenshot

### 5.5 Manual QA Checklist - Date & Time Formatting

#### Test Case I18N-027: Date Format in English (P1)
- [ ] **Steps**:
  1. English mode
  2. Check transaction dates
- [ ] **Expected Result**:
  - Format: "Jan 20, 2024" or "January 20, 2024"
  - Month names in English
- [ ] **Evidence**: Screenshot

#### Test Case I18N-028: Date Format in Arabic (P1)
- [ ] **Steps**:
  1. Arabic mode
  2. Check transaction dates
- [ ] **Expected Result**:
  - Format: "٢٠ يناير ٢٠٢٤" or similar
  - Month names in Arabic
- [ ] **Evidence**: Screenshot

#### Test Case I18N-029: Time Format Consistency (P2)
- [ ] **Steps**:
  1. Check timestamps in both languages
- [ ] **Expected Result**:
  - Time format: 24-hour (HH:mm)
  - Consistent across languages
- [ ] **Evidence**: Screenshot

### 5.6 Automation Roadmap - i18n

**Test Files Structure**:
```
tests/
  i18n/
    language-switching.spec.ts
    rtl-ltr-layout.spec.ts
    translation-completeness.spec.ts
    formatting.spec.ts
```

**Key Automation Tests**:

```typescript
// language-switching.spec.ts
test('I18N-002: Switch to Arabic', async ({ page }) => {
  await page.goto('/');
  await loginAsAdmin(page);

  // Check initial language
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  // Click language toggle
  await page.click('[data-testid=language-toggle]');

  // Verify Arabic
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // Check UI text
  await expect(page.locator('nav >> text=لوحة التحكم')).toBeVisible();
});

test('I18N-004: Language persists on refresh', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid=language-toggle]'); // Switch to Arabic

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

// rtl-ltr-layout.spec.ts
test('I18N-006: RTL layout for Arabic', async ({ page }) => {
  await switchToArabic(page);

  // Check sidebar position (RTL: right side)
  const sidebar = page.locator('[data-testid=sidebar]');
  const sidebarBox = await sidebar.boundingBox();
  const pageWidth = await page.viewportSize().width;

  // Sidebar should be on right side (x position > half width)
  expect(sidebarBox.x).toBeGreaterThan(pageWidth / 2);

  // Check text alignment
  const heading = page.locator('h1').first();
  await expect(heading).toHaveCSS('text-align', 'right');
});

// translation-completeness.spec.ts
const pages = ['/', '/transactions', '/approvals', '/reports', '/users', '/audit'];

for (const pagePath of pages) {
  test(`All UI text translated on ${pagePath}`, async ({ page }) => {
    await page.goto(pagePath);
    await switchToArabic(page);

    // Check no English text leaking (heuristic)
    const bodyText = await page.locator('body').textContent();

    // Common untranslated words to check for
    const englishWords = ['Dashboard', 'Transactions', 'Approvals', 'Reports', 'Users'];
    for (const word of englishWords) {
      expect(bodyText).not.toContain(word);
    }
  });
}

// formatting.spec.ts
test('I18N-023-024: Currency symbol changes', async ({ page }) => {
  await page.goto('/');

  // English
  await expect(page.locator('text=/\\d+\\.\\d{2} EGP/').first()).toBeVisible();

  // Switch to Arabic
  await switchToArabic(page);
  await expect(page.locator('text=/\\d+\\.\\d{2} ج\\.م/').first()).toBeVisible();
});

test('Date formatting respects locale', async ({ page }) => {
  await page.goto('/transactions');

  // Get first date cell
  const dateCell = page.locator('[data-testid=transaction-date]').first();

  // English
  const englishDate = await dateCell.textContent();
  expect(englishDate).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/); // "Jan 20, 2024"

  // Switch to Arabic
  await switchToArabic(page);
  const arabicDate = await dateCell.textContent();
  // Verify Arabic month names or format
  expect(arabicDate).toMatch(/يناير|فبراير|مارس/); // Arabic month names
});
```

**Visual Regression Testing**:
```typescript
// Use Playwright's screenshot comparison
test('RTL layout visual regression', async ({ page }) => {
  await switchToArabic(page);
  await page.goto('/transactions');

  await expect(page).toHaveScreenshot('transactions-rtl.png');
});

test('LTR layout visual regression', async ({ page }) => {
  await page.goto('/transactions');

  await expect(page).toHaveScreenshot('transactions-ltr.png');
});
```

**Translation Key Coverage Test**:
```typescript
// Check that all translation keys are used
import enTranslations from '../locales/en/common.json';
import arTranslations from '../locales/ar/common.json';

test('All English keys have Arabic translations', () => {
  const enKeys = Object.keys(flattenObject(enTranslations));
  const arKeys = Object.keys(flattenObject(arTranslations));

  for (const key of enKeys) {
    expect(arKeys).toContain(key);
  }
});

test('No missing translations', () => {
  // Check for empty strings or missing keys
  const arValues = Object.values(flattenObject(arTranslations));

  for (const value of arValues) {
    expect(value).not.toBe('');
    expect(value).toBeTruthy();
  }
});
```

---

## 6. Edge Cases Testing

**Objective**: Test uncommon scenarios and boundary conditions including token expiry, rate limiting, timezone edge cases, and error recovery.

### 6.1 Manual QA Checklist - Token Expiry & Refresh

#### Test Case EDGE-001: Token Auto-Refresh Before Expiry (P0)
- [ ] **Steps**:
  1. Login as any user
  2. Note token expiry time (15 minutes)
  3. Wait 13 minutes (2 minutes before expiry)
  4. Check Network tab for refresh request
- [ ] **Expected Result**:
  - POST /auth/refresh called automatically
  - New access token received
  - User session continues without interruption
- [ ] **Evidence**: Network tab screenshot at 13-minute mark

#### Test Case EDGE-002: Manual Token Expiry (P0)
- [ ] **Steps**:
  1. Login
  2. Wait 15+ minutes without activity
  3. Attempt to perform an action (e.g., create transaction)
- [ ] **Expected Result**:
  - Token refresh attempted automatically
  - If refresh succeeds: Action completes
  - If refresh fails: Redirect to login
- [ ] **Evidence**: Screenshot + Network tab

#### Test Case EDGE-003: Token Refresh Failure (P0)
- [ ] **Steps**:
  1. Login
  2. Manually delete refresh token from localStorage
  3. Wait for auto-refresh to trigger
- [ ] **Expected Result**:
  - Refresh fails
  - User redirected to login page
  - Error toast: "Session expired. Please login again."
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-004: Session Persistence Across Tabs (P1)
- [ ] **Steps**:
  1. Login in Tab 1
  2. Open Tab 2 to same application
- [ ] **Expected Result**:
  - Tab 2 automatically logged in (shares refresh token)
  - Both tabs maintain session
- [ ] **Evidence**: Screenshots from both tabs

#### Test Case EDGE-005: Logout in One Tab Logs Out All Tabs (P1)
- [ ] **Steps**:
  1. Login in Tab 1 and Tab 2
  2. Logout in Tab 1
  3. Check Tab 2
- [ ] **Expected Result**:
  - Tab 2 eventually detects logout
  - Redirects to login or shows "Session ended" message
- [ ] **Evidence**: Screenshots

### 6.2 Manual QA Checklist - Rate Limiting

#### Test Case EDGE-006: Login Rate Limit (429) (P0)
- [ ] **Steps**:
  1. Attempt to login 6 times rapidly with wrong password
  2. Check response on 6th attempt
- [ ] **Expected Result**:
  - 429 Too Many Requests error
  - Error message: "Too many login attempts. Please wait 60 seconds."
  - Countdown timer shown
- [ ] **Evidence**: Screenshot + Network tab

#### Test Case EDGE-007: Rate Limit Countdown Timer (P1)
- [ ] **Steps**:
  1. Trigger rate limit
  2. Observe countdown
- [ ] **Expected Result**:
  - Timer counts down from 60 to 0
  - Login button disabled during countdown
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-008: Rate Limit Resets After 60 Seconds (P1)
- [ ] **Steps**:
  1. Trigger rate limit
  2. Wait 60 seconds
  3. Attempt to login again
- [ ] **Expected Result**:
  - Login allowed after 60 seconds
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-009: Refresh Token Rate Limit (P1)
- [ ] **Steps**:
  1. Use API to call POST /auth/refresh 6 times rapidly
- [ ] **Expected Result**:
  - 429 error after 5 requests
- [ ] **Evidence**: API response

### 6.3 Manual QA Checklist - Timezone Edge Cases

#### Test Case EDGE-010: Transaction Created at Midnight (P2)
- [ ] **Steps**:
  1. Create transaction at 23:59:59 Africa/Cairo
  2. Wait 1 minute (now 00:00:00 next day)
  3. Check transaction date
- [ ] **Expected Result**:
  - Transaction date shows correct day
  - No date confusion
- [ ] **Evidence**: Screenshot + timestamp

#### Test Case EDGE-011: Report Date Range Across Months (P2)
- [ ] **Steps**:
  1. Navigate to Reports
  2. Set date range: Jan 25 - Feb 5
  3. Generate report
- [ ] **Expected Result**:
  - Report includes transactions from both months
  - Daily chart shows continuous timeline
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-012: Date Display Consistency Across Timezones (P3)
- [ ] **Steps**:
  1. Create transaction at known time (Africa/Cairo)
  2. Check displayed timestamp
  3. Compare with server timestamp
- [ ] **Expected Result**:
  - Displayed time matches Africa/Cairo
  - No GMT/UTC confusion
- [ ] **Evidence**: Comparison table

### 6.4 Manual QA Checklist - Network & Error Handling

#### Test Case EDGE-013: Offline Mode Detection (P1)
- [ ] **Steps**:
  1. Login
  2. Disconnect internet
  3. Attempt to navigate or perform action
- [ ] **Expected Result**:
  - Error message: "No internet connection. Please check your network."
  - Actions gracefully fail without breaking UI
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-014: Slow Network (API Timeout) (P2)
- [ ] **Steps**:
  1. Use DevTools to throttle network (Slow 3G)
  2. Attempt to load Reports page
- [ ] **Expected Result**:
  - Loading indicators shown
  - Timeout after 30 seconds
  - Error message: "Request timed out. Please try again."
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-015: 500 Server Error Handling (P1)
- [ ] **Steps**:
  1. Trigger server error (may need backend mock)
  2. Observe frontend behavior
- [ ] **Expected Result**:
  - Error toast: "Something went wrong. Please try again later."
  - UI remains stable
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-016: Concurrent Edit Conflict (P2)
- [ ] **Steps**:
  1. Open same transaction in two tabs (ADMIN)
  2. Edit in Tab 1, save
  3. Edit in Tab 2 (still has old data), save
- [ ] **Expected Result**:
  - Conflict detected
  - Warning: "This transaction was modified by another user"
- [ ] **Evidence**: Screenshot

### 6.5 Manual QA Checklist - Data Boundary Cases

#### Test Case EDGE-017: Transaction with Exactly 0.01 EGP (P1)
- [ ] **Steps**:
  1. Create transaction with amount: 0.01
  2. Submit
- [ ] **Expected Result**:
  - Accepted (minimum valid amount)
  - Displayed as "0.01 EGP"
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-018: Transaction with Maximum Amount (P1)
- [ ] **Steps**:
  1. Create transaction with amount: 9999999.99
  2. Submit
- [ ] **Expected Result**:
  - Accepted
  - Displayed as "9,999,999.99 EGP"
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-019: Description with Exactly 500 Characters (P2)
- [ ] **Steps**:
  1. Enter description with exactly 500 chars
  2. Submit
- [ ] **Expected Result**:
  - Accepted
  - Character counter shows "500/500" (not red)
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-020: Rejection Reason with Exactly 10 Characters (P2)
- [ ] **Steps**:
  1. Reject transaction
  2. Enter reason: "1234567890" (exactly 10 chars)
  3. Submit
- [ ] **Expected Result**:
  - Accepted (minimum valid length)
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-021: Pagination at Boundary (P2)
- [ ] **Steps**:
  1. Navigate to Transactions with exactly 20 results
  2. Set limit to 20
  3. Check pagination
- [ ] **Expected Result**:
  - Shows "1-20 of 20"
  - No "Next" button or disabled
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-022: Empty Search Results (P2)
- [ ] **Steps**:
  1. Transactions page
  2. Search for non-existent term: "ZZZZZZ"
- [ ] **Expected Result**:
  - Empty state: "No transactions found"
  - No errors
- [ ] **Evidence**: Screenshot

### 6.6 Manual QA Checklist - User Deactivation Edge Cases

#### Test Case EDGE-023: Deactivated User Cannot Login (P0)
- [ ] **Steps**:
  1. As ADMIN, deactivate a user
  2. As that user, attempt to login
- [ ] **Expected Result**:
  - Error: "Your account has been deactivated. Contact administrator."
  - Cannot proceed
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-024: Deactivated User Session Terminated (P1)
- [ ] **Steps**:
  1. User logged in
  2. In another tab, ADMIN deactivates that user
  3. Original user attempts action
- [ ] **Expected Result**:
  - Action fails
  - Error: "Your account has been deactivated"
  - Redirected to login
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-025: Reactivated User Can Login Again (P1)
- [ ] **Steps**:
  1. Deactivated user
  2. As ADMIN, activate user
  3. As that user, attempt login
- [ ] **Expected Result**:
  - Login succeeds
  - Full access restored
- [ ] **Evidence**: Screenshot

### 6.7 Manual QA Checklist - Transaction Status Edge Cases

#### Test Case EDGE-026: Cannot Approve Already Approved Transaction (P1)
- [ ] **Steps**:
  1. Navigate to APPROVED transaction
  2. Check for Approve button
- [ ] **Expected Result**:
  - No Approve button visible
  - Status badge shows "APPROVED" (immutable)
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-027: Cannot Edit After Approval (P0)
- [ ] **Steps**:
  1. Approve a transaction
  2. Check detail page for Edit button
- [ ] **Expected Result**:
  - No Edit button
  - All fields read-only
- [ ] **Evidence**: Screenshot

#### Test Case EDGE-028: Rejected Transaction Shows Reason (P1)
- [ ] **Steps**:
  1. Reject a transaction with reason
  2. View detail page
- [ ] **Expected Result**:
  - Rejection reason displayed prominently
  - Rejected by: admin email
  - Rejected at: timestamp
- [ ] **Evidence**: Screenshot

### 6.8 Automation Roadmap - Edge Cases

**Test Files Structure**:
```
tests/
  edge-cases/
    token-management.spec.ts
    rate-limiting.spec.ts
    network-errors.spec.ts
    boundary-values.spec.ts
```

**Key Automation Tests**:

```typescript
// token-management.spec.ts
test('EDGE-001: Token auto-refresh', async ({ page, context }) => {
  await page.goto('/');
  await login(page);

  // Mock time to fast-forward 13 minutes
  await page.evaluate(() => {
    const originalDate = Date;
    Date.now = () => originalDate.now() + 13 * 60 * 1000;
  });

  // Wait for refresh request
  const refreshRequest = page.waitForRequest('**/auth/refresh');
  await page.click('a[href="/transactions"]'); // Trigger activity

  await refreshRequest;

  // Verify new token
  const cookies = await context.cookies();
  const accessToken = cookies.find(c => c.name === 'accessToken');
  expect(accessToken).toBeTruthy();
});

test('EDGE-003: Token refresh failure redirects to login', async ({ page }) => {
  await page.goto('/');
  await login(page);

  // Clear refresh token
  await page.evaluate(() => localStorage.removeItem('refreshToken'));

  // Trigger refresh (simulate expiry)
  await page.evaluate(() => {
    // Force token expiry
  });

  // Should redirect to login
  await expect(page).toHaveURL('/login');
  await expect(page.locator('text=Session expired')).toBeVisible();
});

// rate-limiting.spec.ts
test('EDGE-006: Login rate limit (429)', async ({ page }) => {
  await page.goto('/login');

  // Attempt 6 logins
  for (let i = 0; i < 6; i++) {
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'wrongpassword');
    await page.click('button[type=submit]');
    await page.waitForTimeout(100);
  }

  // Check for rate limit error
  await expect(page.locator('text=Too many login attempts')).toBeVisible();
  await expect(page.locator('[data-testid=countdown-timer]')).toBeVisible();
});

// network-errors.spec.ts
test('EDGE-013: Offline mode detection', async ({ page, context }) => {
  await page.goto('/');
  await login(page);

  // Simulate offline
  await context.setOffline(true);

  // Attempt action
  await page.click('a[href="/transactions"]');

  // Should show offline error
  await expect(page.locator('text=No internet connection')).toBeVisible();
});

test('EDGE-014: API timeout', async ({ page }) => {
  await page.route('**/api/**', route => {
    // Delay response to trigger timeout
    setTimeout(() => route.abort(), 31000); // > 30s timeout
  });

  await page.goto('/reports');

  await expect(page.locator('text=Request timed out')).toBeVisible({ timeout: 35000 });
});

// boundary-values.spec.ts
const boundaryTests = [
  { amount: '0.01', expected: 'accepted' },
  { amount: '0.00', expected: 'rejected' },
  { amount: '9999999.99', expected: 'accepted' },
  { amount: '10000000.00', expected: 'rejected' },
  { amount: '100.123', expected: 'rejected' },
];

for (const { amount, expected } of boundaryTests) {
  test(`Amount boundary: ${amount} should be ${expected}`, async ({ page }) => {
    await page.goto('/transactions/new');
    await page.fill('[name=amount]', amount);
    await page.click('button[type=submit]');

    if (expected === 'rejected') {
      await expect(page.locator('.error-message')).toBeVisible();
    } else {
      await expect(page).not.toHaveURL('/transactions/new');
    }
  });
}
```

**Retry Logic Testing**:
```typescript
test('Failed request retries', async ({ page }) => {
  let attemptCount = 0;

  await page.route('**/api/transactions', route => {
    attemptCount++;
    if (attemptCount < 3) {
      route.abort('failed'); // Fail first 2 attempts
    } else {
      route.fulfill({ status: 200, body: '[]' }); // Succeed on 3rd
    }
  });

  await page.goto('/transactions');

  // Should eventually succeed
  await expect(page.locator('[data-testid=transactions-table]')).toBeVisible();
  expect(attemptCount).toBe(3);
});
```

---

## 7. Test Data & Credentials

### 7.1 Test User Credentials

**ADMIN User:**
- Email: `info@brightc0de.com`
- Password: `Brightc0de@info`
- Role: ADMIN
- Use for: Full access testing, approval workflows, user management

**SALES User 1:**
- Email: `sales1@brightcode.eg`
- Password: `Sales@12345`
- Role: SALES
- Use for: RBAC testing, own transaction access

**SALES User 2:**
- Email: `sales2@brightcode.eg`
- Password: `Sales@12345`
- Role: SALES
- Use for: Cross-user transaction access testing

**Deactivated User:**
- Email: `inactive@brightcode.eg`
- Password: `Inactive@123`
- Status: Deactivated
- Use for: Login denial testing

### 7.2 Test Transaction Data

**PENDING Transaction (with attachments):**
- ID: `TXN001`
- Number: `BC-2024-000001`
- Type: OUT
- Amount: "1500.50"
- Category: SOFTWARE
- Description: "Adobe Creative Cloud annual subscription"
- Created By: sales1@brightcode.eg
- Attachments: 2 files
- Use for: Approval/rejection testing

**PENDING Transaction (no attachments):**
- ID: `TXN002`
- Number: `BC-2024-000002`
- Type: IN
- Amount: "5000.00"
- Category: WEBSITES
- Description: "Website development project - Client A"
- Created By: sales2@brightcode.eg
- Attachments: 0 files
- Use for: "Cannot approve without attachment" testing

**APPROVED Transaction:**
- ID: `TXN003`
- Number: `BC-2024-000003`
- Type: IN
- Amount: "10000.00"
- Status: APPROVED
- Use for: Immutability testing

**REJECTED Transaction:**
- ID: `TXN004`
- Number: `BC-2024-000004`
- Type: OUT
- Status: REJECTED
- Rejection Reason: "Invoice does not match purchase order details"
- Use for: Display rejection reason testing

**Transaction with 5 Attachments:**
- ID: `TXN005`
- Attachments: 5 files (max reached)
- Use for: "Cannot upload 6th attachment" testing

**Transaction with 1 Attachment:**
- ID: `TXN006`
- Attachments: 1 file
- Use for: "Cannot delete last attachment" testing

### 7.3 Test Files for Upload

**Valid Files:**
- `test-receipt.jpg` - 1.2 MB JPEG image
- `test-invoice.pdf` - 850 KB PDF document
- `test-photo.png` - 2.3 MB PNG image
- `exactly-5mb.jpg` - Exactly 5,242,880 bytes

**Invalid Files:**
- `oversized.jpg` - 6 MB (exceeds 5MB limit)
- `document.docx` - Word document (not allowed type)
- `spreadsheet.xlsx` - Excel file (not allowed type)
- `fake-image.jpg` - Text file renamed to .jpg (MIME mismatch)

### 7.4 Sample Report Data

**Balance Report (All-Time):**
- Total Income: "45000.00" EGP
- Total Expenses: "23500.50" EGP
- Net Balance: "21499.50" EGP
- As Of: 2024-01-20 14:30:00 (Africa/Cairo)

**Period Summary (Current Month):**
- Date Range: 2024-01-01 to 2024-01-20
- Total In: "10000.00" EGP
- Total Out: "5500.00" EGP
- Net Cashflow: "4500.00" EGP
- Count IN: 15
- Count OUT: 22
- Total Count: 37

**Expenses by Category:**
- SOFTWARE: "5000.00" EGP (10 transactions)
- HOSTING: "3000.00" EGP (12 transactions)
- MARKETING: "2000.00" EGP (5 transactions)
- OTHER: "1000.00" EGP (3 transactions)
- Grand Total: "11000.00" EGP

### 7.5 Seed Data Script

For automated testing, use a seed script to populate the database:

```typescript
// scripts/seed-test-data.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  // Create users
  const adminUser = await prisma.user.create({
    data: {
      email: 'info@brightc0de.com',
      password: await bcrypt.hash('Brightc0de@info', 10),
      role: 'ADMIN',
      isActive: true,
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      email: 'sales1@brightcode.eg',
      password: await bcrypt.hash('Sales@12345', 10),
      role: 'SALES',
      isActive: true,
    },
  });

  // Create transactions
  await prisma.transaction.create({
    data: {
      transactionNumber: 'BC-2024-000001',
      type: 'OUT',
      amount: '1500.50',
      category: 'SOFTWARE',
      description: 'Adobe Creative Cloud annual subscription',
      status: 'PENDING',
      createdById: sales1.id,
    },
  });

  // ... more seed data
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 8. Test Environment Setup

### 8.1 Prerequisites

**System Requirements:**
- Node.js: v18+ or v20+
- npm or yarn
- Git
- Modern browser: Chrome, Firefox, or Edge (latest versions)

**For Automated Testing:**
- Playwright: `npm install -D @playwright/test`
- Or Cypress: `npm install -D cypress`

### 8.2 Environment Configuration

**Frontend Environment (.env.local):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_AVAILABLE_LOCALES=en,ar
```

**Backend Environment:**
- Ensure backend is running on `http://localhost:3000`
- Database seeded with test data
- Rate limiting enabled for /auth endpoints

### 8.3 Running the Application

**Development Mode:**
```bash
# Install dependencies
npm install

# Run frontend
npm run dev
# Accessible at: http://localhost:3001

# Run backend (separate terminal)
cd ../backend
npm run start:dev
# Running at: http://localhost:3000
```

**Production Build (for testing):**
```bash
npm run build
npm run start
```

### 8.4 Browser DevTools Setup

For manual testing, enable:
- **Network Tab**: Monitor API requests/responses
- **Console**: Check for JavaScript errors
- **Application Tab**: Inspect localStorage (refresh token)
- **Device Toolbar**: Test responsive layouts and RTL

**Recommended Extensions:**
- React Developer Tools
- Redux DevTools (if applicable)
- JSON Viewer

### 8.5 Playwright Setup

**Installation:**
```bash
npm install -D @playwright/test
npx playwright install # Install browser binaries
```

**Configuration (playwright.config.ts):**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Running Tests:**
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/rbac/sales-user-restrictions.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Generate report
npx playwright show-report
```

### 8.6 Cypress Setup

**Installation:**
```bash
npm install -D cypress
npx cypress open
```

**Configuration (cypress.config.ts):**
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },

  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,
});
```

**Running Tests:**
```bash
# Open Cypress UI
npx cypress open

# Run headless
npx cypress run

# Run specific spec
npx cypress run --spec "cypress/e2e/rbac/sales-restrictions.cy.ts"
```

### 8.7 Test Data Reset

Before each test run (especially for automated tests), reset the database:

```bash
# Backend directory
npm run db:reset
npm run db:seed
```

Or use a test database:
```env
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/cashflow_test"
```

---

## 9. Reporting & Bug Tracking

### 9.1 Test Execution Tracking

**Manual Testing Tracking:**
- Use this document with checkboxes
- Mark [ ] → [x] as tests are executed
- Document results in a separate spreadsheet or test management tool

**Recommended Format:**
| Test ID | Test Case | Status | Notes | Evidence | Tested By | Date |
|---------|-----------|--------|-------|----------|-----------|------|
| DA-001 | Verify amount format | PASS | Amounts are strings | screenshot.png | Tester Name | 2024-01-20 |
| RBAC-001 | SALES cannot access /approvals | FAIL | No redirect, 403 not shown | bug-001.png | Tester Name | 2024-01-20 |

### 9.2 Bug Report Template

**Bug Report Format:**

```
Bug ID: BUG-001
Title: SALES user can access /approvals page
Severity: Critical (P0)
Priority: High
Status: Open

Environment:
- Frontend: Next.js 16.1.4
- Browser: Chrome 120.0
- OS: Windows 11

Test Case Reference: RBAC-001

Steps to Reproduce:
1. Login as SALES user (sales1@brightcode.eg)
2. Navigate directly to /approvals via URL bar
3. Observe page loads instead of showing 403

Expected Result:
- 403 Forbidden page displayed
- User cannot access approvals

Actual Result:
- Approvals page loads
- SALES user can see pending approvals list

Evidence:
- Screenshot: bug-001-approvals-page.png
- Network tab: bug-001-network.png
- Console errors: None

Notes:
- Route protection not enforced on /approvals
- Backend returns data (should return 403)
- Frontend ProtectedRoute component may be missing requiredRole prop

Suggested Fix:
Add requiredRole={Role.ADMIN} to ApprovalPage ProtectedRoute wrapper
```

### 9.3 Severity Levels

**P0 - Critical (Blocker):**
- Security vulnerabilities (RBAC bypass, auth issues)
- Data corruption or loss
- Application crash or unusable
- Examples: RBAC-001, DA-001, VAL-001

**P1 - High:**
- Major functionality broken
- No workaround available
- Affects core user flows
- Examples: FILE-001, I18N-001, EDGE-001

**P2 - Medium:**
- Functionality impaired but workaround exists
- UI/UX issues
- Minor data inconsistencies
- Examples: I18N-011, EDGE-011

**P3 - Low:**
- Cosmetic issues
- Minor UI glitches
- Documentation errors
- Examples: I18N-021, FILE-017

### 9.4 Test Metrics

**Key Metrics to Track:**
- **Test Coverage**: % of test cases executed
- **Pass Rate**: (Passed tests / Total tests) × 100
- **Bug Density**: Bugs found per test case
- **Critical Bug Rate**: % of P0/P1 bugs
- **Test Execution Time**: Time to complete all tests

**Sample Report:**
```
Test Execution Summary - 2024-01-20

Total Test Cases: 150
Executed: 140 (93%)
Passed: 125 (89%)
Failed: 15 (11%)
Blocked: 10 (7%)

Bugs Found: 22
- P0 Critical: 3
- P1 High: 8
- P2 Medium: 7
- P3 Low: 4

Test Coverage by Category:
- Data Accuracy: 100% (20/20 passed)
- RBAC: 85% (28/33 passed, 5 failed)
- Validation: 95% (38/40 passed)
- File Handling: 90% (18/20 passed)
- i18n: 100% (30/30 passed)
- Edge Cases: 75% (21/28 passed, 7 blocked)
```

### 9.5 Continuous Testing

**Pre-Release Checklist:**
Before each release, ensure:
- [ ] All P0 tests pass
- [ ] All P1 tests pass
- [ ] No open P0/P1 bugs
- [ ] Regression tests executed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed (WCAG 2.1 AA)

**Regression Testing:**
After bug fixes or new features:
- Re-run all affected test cases
- Execute smoke tests (critical paths)
- Verify no new bugs introduced

**Automated Test Execution (CI/CD):**
```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Appendix A: Test Case Quick Reference

### By Priority

**P0 (Critical) - Must Pass:**
- DA-001, DA-002, DA-004
- RBAC-001 through RBAC-010, RBAC-014, RBAC-016, RBAC-018, RBAC-020, RBAC-021
- VAL-001, VAL-002, VAL-007, VAL-008, VAL-012, VAL-013, VAL-014, VAL-015, VAL-017, VAL-018, VAL-019, VAL-020, VAL-022, VAL-024, VAL-025, VAL-026, VAL-027, VAL-028
- FILE-001, FILE-003, FILE-008, FILE-009, FILE-010, FILE-012, FILE-013, FILE-014
- I18N-001, I18N-002, I18N-003, I18N-006, I18N-007, I18N-012, I18N-013, I18N-014, I18N-015, I18N-017, I18N-023, I18N-024
- EDGE-001, EDGE-002, EDGE-003, EDGE-006, EDGE-023, EDGE-027

**P1 (High):**
- DA-003, DA-005, DA-006, DA-008, DA-010, DA-011, DA-012, DA-014, DA-015, DA-016
- RBAC-011, RBAC-012, RBAC-013, RBAC-015, RBAC-017, RBAC-024, RBAC-025, RBAC-026, RBAC-027, RBAC-029, RBAC-030, RBAC-031
- VAL-003, VAL-004, VAL-005, VAL-016, VAL-023, VAL-029
- FILE-002, FILE-004, FILE-005, FILE-006, FILE-007, FILE-011, FILE-016, FILE-020
- I18N-004, I18N-005, I18N-008, I18N-009, I18N-010, I18N-016, I18N-018, I18N-019, I18N-020, I18N-025, I18N-026, I18N-027, I18N-028
- EDGE-004, EDGE-005, EDGE-007, EDGE-008, EDGE-009, EDGE-013, EDGE-015, EDGE-017, EDGE-018, EDGE-024, EDGE-025, EDGE-026, EDGE-028

**P2 (Medium) and P3 (Low): See full test case list**

### By Test Category

**Data Accuracy:** DA-001 to DA-016
**RBAC:** RBAC-001 to RBAC-032
**Validation:** VAL-001 to VAL-030
**File Handling:** FILE-001 to FILE-022
**i18n:** I18N-001 to I18N-029
**Edge Cases:** EDGE-001 to EDGE-028

---

## Appendix B: Automation Framework Recommendations

### Playwright (Recommended)

**Pros:**
- ✅ Built-in TypeScript support
- ✅ Auto-wait for elements
- ✅ Parallel execution
- ✅ Cross-browser (Chromium, Firefox, WebKit)
- ✅ API testing support
- ✅ Excellent debugging tools

**Cons:**
- ❌ Newer than Cypress (smaller community)
- ❌ Steeper learning curve for beginners

**Best For:**
- Large-scale test suites
- Cross-browser testing
- API integration tests
- CI/CD pipelines

### Cypress

**Pros:**
- ✅ Developer-friendly UI
- ✅ Time-travel debugging
- ✅ Automatic screenshots/videos
- ✅ Large community

**Cons:**
- ❌ Slower than Playwright
- ❌ Limited cross-browser support
- ❌ Runs inside browser (limitations)

**Best For:**
- Rapid test development
- Visual debugging
- Frontend-focused testing

### Testing Library (Unit/Integration)

For component-level testing:
```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

**Best For:**
- Testing React components in isolation
- Validation logic unit tests
- Formatter function tests

---

## Appendix C: Common Issues & Troubleshooting

### Issue 1: Tests Fail Intermittently

**Symptoms:**
- Tests pass locally but fail in CI
- Random timeouts

**Solutions:**
- Increase timeout values
- Add explicit waits for API responses
- Use `waitForLoadState('networkidle')`
- Check for race conditions

### Issue 2: Authentication Fails in Tests

**Symptoms:**
- Login works manually but fails in automation
- Token not persisted

**Solutions:**
- Ensure cookies/localStorage properly set
- Use `storageState` to save auth state
- Check CORS settings

### Issue 3: RTL Tests Fail

**Symptoms:**
- Elements not found in RTL mode
- Layout assertions fail

**Solutions:**
- Use logical properties (start/end instead of left/right)
- Check `document.dir` attribute
- Wait for layout shift after language change

### Issue 4: File Upload Tests Fail

**Symptoms:**
- File not uploading
- Validation errors

**Solutions:**
- Use absolute paths for test files
- Verify MIME types match file content
- Check file sizes are within limits

---

## Conclusion

This testing plan provides comprehensive coverage of all critical functionality in the Bright Code Cashflow Dashboard frontend application. By following this plan:

✅ **Data Accuracy** is verified through string amount checks, timezone validation, and calculation verification
✅ **RBAC** is enforced with thorough testing of SALES vs ADMIN access restrictions
✅ **Validation Rules** are tested for all forms and inputs with boundary value analysis
✅ **File Handling** is validated including 5MB limit, file types, and attachment rules
✅ **i18n** is tested for language switching, RTL/LTR layouts, and translation completeness
✅ **Edge Cases** are covered including token expiry, rate limiting, and timezone edge cases

**Next Steps:**
1. Execute manual QA checklist and document results
2. Set up automated testing framework (Playwright recommended)
3. Implement priority tests (P0 first, then P1)
4. Integrate tests into CI/CD pipeline
5. Establish regression testing cadence

**Estimated Effort:**
- Manual QA: 40-60 hours (1-2 weeks full-time)
- Automation Setup: 20-30 hours
- Full Automation: 80-120 hours (2-3 weeks)

For questions or clarifications, refer to `FRONTEND_SPECIFICATION.md` or contact the development team.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-20
**Maintained By:** QA Team
