Task: Generate Next.js Frontend Specification for Bright Code Cashflow Dashboard

     Critical Alignment Rule (Mandatory)

     The backend is the single source of truth. You must strictly adhere to these rules:

     1. If a requested frontend feature is NOT supported by the backend: Either correct it to the closest supported behavior OR remove it from scope
     entirely.
     2. If requested behavior conflicts with backend rules: (status transitions, permissions, required fields, validations, attachment requirements,
     etc.), you MUST correct the request to match the backend exactly.
     3. Do NOT invent endpoints or backend behavior. Only use what exists in the backend contract.
     4. Document all corrections: Create a section called "Corrections & Removed Requests (Backend-Driven)" listing any features that were corrected or
     removed due to backend constraints.

     Phase 1: Backend Contract Discovery (Mandatory First Step)

     Before designing any frontend feature, you MUST:

     1. Read the OpenAPI contract: Located at specs/001-cashflow-backend/contracts/openapi.yaml
     2. List all discovered endpoints: Create a complete inventory with method, path, operation ID, required auth, and role restrictions.
     3. Verify against actual controllers: Read these controller files to identify any discrepancies:
       - src/auth/auth.controller.ts
       - src/users/users.controller.ts
       - src/transactions/transactions.controller.ts
       - src/attachments/attachments.controller.ts
       - src/reports/reports.controller.ts
       - src/audit/audit.controller.ts
     4. Document mismatches: Create a "Known Differences Between OpenAPI & Controllers" section noting any conflicts or missing endpoints.
     5. Read backend documentation: Review docs/frontend-integration/03-api-reference.md for additional backend behavior details, validation rules, and
     error scenarios.

     Phase 2: System Context & Requirements

     System Overview

     This is an internal admin dashboard (no public pages) for tracking company cashflow. It must be fully mobile-responsive and support bilingual
     operation.

     Core Backend Rules (Enforced)

     Authentication:
     - JWT-based with access tokens (15-min expiry) and refresh tokens (7-day expiry)
     - Token rotation on refresh (old tokens revoked)
     - Rate limiting: 5 login attempts per 60 seconds
     - Roles: ADMIN and SALES

     Transactions:
     - Types: IN (income) or OUT (expense)
     - Statuses: PENDING → APPROVED or PENDING → REJECTED (immutable once approved/rejected)
     - Transaction number format: BC-YYYY-NNNNNN (auto-generated, cannot be modified)
     - Mandatory attachment rule: Every transaction MUST have at least one receipt/invoice attachment
     - Approval requirement: ADMIN-only action, requires at least one attachment present
     - Rejection requirement: ADMIN-only action, requires rejection reason (10-500 characters)
     - Soft delete: ADMIN-only, requires deletion reason (10-500 characters), transaction remains in database
     - Only APPROVED transactions affect balance and reports

     Attachments:
     - Max file size: 5MB (backend actual implementation) or 10MB (OpenAPI spec - verify which is correct)
     - Allowed formats: JPEG, PNG, PDF (verify against OpenAPI which lists more formats)
     - Max 5 attachments per transaction (backend enforcement)
     - Cannot delete last attachment: Each transaction must always have at least 1 attachment
     - Only uploadable/deletable when transaction status is PENDING

     Categories:
     - OUT (Expenses): DOMAINS, HOSTING, PLUGINS, EMPLOYEES, OTHER (verify against OpenAPI spec)
     - IN (Income): DESIGN, WEBSITES, OTHER (verify against OpenAPI spec)
     - Category must match transaction type (backend validation)

     Permissions:
     - SALES users: Can create transactions, view only their own transactions, upload attachments to their own transactions
     - ADMIN users: Full access - can view all transactions, approve/reject, delete, access reports, manage users, view audit logs

     Timezone:
     - All dates displayed in Africa/Cairo timezone (UTC+2)
     - Daily report grouping uses Africa/Cairo boundaries

     Financial Precision:
     - All monetary values returned as strings (not numbers) to ensure decimal precision
     - Display format: EGP currency with 2 decimal places

     Required Pages (Backend-Supported Only)

     You must verify each page's features against available backend endpoints:

     1. Login Page (/login)
       - Email + password authentication
       - Error handling for invalid credentials, rate limiting, deactivated accounts
       - Remember me functionality (optional, if supported)
     2. Dashboard (/dashboard or /)
       - ADMIN view: Current balance snapshot (total IN, total OUT, net balance), pending approvals count
       - SALES view: Their own pending transactions count, recent activity
       - Quick actions appropriate to role
     3. Transactions Management (/transactions)
       - List view with filtering (status, type, date range, category, search)
       - Pagination (backend supports: page, limit parameters)
       - Create new transaction form (type, amount, category, description)
       - Transaction details view with attachments display
       - Attachment upload UI (drag-drop or file picker, max 5 files)
       - Role-based actions: SALES can edit/delete own PENDING transactions, ADMIN can edit/delete any
     4. Approvals Queue (/approvals - ADMIN only)
       - List of PENDING transactions requiring approval
       - Approve action (requires at least one attachment check)
       - Reject action with reason input (10-500 chars)
       - Bulk approval capability (if supported by backend - verify)
     5. Reports (/reports - ADMIN only)
       - Balance report (current totals from all APPROVED transactions)
       - Period summary report (fromDate, toDate parameters required)
       - Expenses by category report (fromDate, toDate parameters required)
       - Export options: Excel (.xlsx) and CSV (if CSV export endpoint exists - verify)
     6. Users Management (/users - ADMIN only)
       - List users with filtering (role, isActive status)
       - Create new user (email, password, role)
       - Edit user (update role, password, email if supported)
       - Activate/deactivate user accounts
     7. Audit Logs (/audit - ADMIN only)
       - Paginated audit log viewer
       - Filters: date range, actor user, entity type, action type
       - Display: timestamp, actor, action, entity type, before/after snapshots, IP address

     Technical Requirements

     Framework & Architecture:
     - Next.js 14+ with App Router (preferred) or Pages Router
     - TypeScript for type safety
     - Server-side rendering (SSR) or Static Site Generation (SSG) where appropriate
     - Client-side rendering for dynamic data fetching

     Internationalization (i18n):
     - Support Arabic (ar) and English (en)
     - Default language: Arabic
     - RTL layout for Arabic, LTR layout for English
     - Language switcher in navbar/header
     - All UI text must be translatable (no hardcoded strings)
     - Date/time formatting per locale

     Styling & Responsiveness:
     - Fully mobile-responsive (mobile-first design)
     - Support for both RTL and LTR layouts
     - Consistent design system (colors, typography, spacing)
     - Recommendation: Tailwind CSS with RTL support or Material-UI with direction support

     State Management:
     - Authentication state (access token, refresh token, user info)
     - Global UI state (language, theme if applicable)
     - Server state caching (React Query, SWR, or similar)

     API Integration:
     - Base URL: http://localhost:3000 (development) - configurable via environment variable
     - Authorization header: Bearer {accessToken} for all protected endpoints
     - Automatic token refresh when access token expires (401 response handler)
     - Logout on refresh token failure or user deactivation
     - Error handling for all HTTP status codes (400, 401, 403, 404, 409, 429, 500)

     Phase 3: Required Deliverables

     You must produce the following specification documents:

     1. Sitemap & Routes

     - Complete route structure using Next.js App Router conventions
     - Public vs. protected routes
     - Role-based route access (ADMIN-only routes, SALES-accessible routes)
     - Redirect logic (e.g., authenticated users redirected from /login to /dashboard)

     2. Role-Based Navigation

     - Navigation menu structure for ADMIN users
     - Navigation menu structure for SALES users
     - Active route highlighting
     - Logout button placement

     3. Page-by-Page Requirements

     For each page, provide:
     - Page purpose & description
     - URL route & parameters
     - Required backend endpoints (list method + path + operation ID)
     - UI layout & components (header, filters, table/cards, forms, modals)
     - Form fields with validation rules (match backend validation: min/max length, required fields, format)
     - Display fields & formatting (dates in Africa/Cairo, amounts as strings with 2 decimals, transaction numbers)
     - User interactions & state changes (button clicks, form submissions, filter changes)
     - Loading states (skeleton loaders, spinners)
     - Empty states (no data messages)
     - Error states (form validation errors, API error messages)
     - Role-based visibility (what SALES vs ADMIN can see/do)

     4. API Call Mapping

     Create a table mapping each user action to backend API calls:


     User Action: Login
     Page: /login
     HTTP Method: POST
     Endpoint: /auth/login
     Request Body/Params: {email, password}
     Success Response: {accessToken, refreshToken, user}
     Error Handling: 401 → show error, 429 → rate limit message
     ────────────────────────────────────────
     User Action: ...
     Page: ...
     HTTP Method: ...
     Endpoint: ...
     Request Body/Params: ...
     Success Response: ...
     Error Handling: ...
     5. Authentication & Token Management

     - Token storage strategy: Where to store access token (memory, sessionStorage) and refresh token (httpOnly cookie preferred, or localStorage)
     - Token refresh flow: When to refresh (proactive before expiry vs. reactive on 401)
     - Automatic retry logic: Retry failed requests after token refresh
     - Logout flow: Call /auth/logout endpoint, clear tokens, redirect to login
     - Protected route guards: HOC or middleware to check authentication and role

     6. i18n & RTL/LTR Strategy

     - i18n library: Recommendation (e.g., next-i18next, react-i18next)
     - Translation file structure: /locales/{lang}/{namespace}.json
     - RTL/LTR switching: CSS direction attribute, layout adjustments
     - Date/number formatting: Use locale-aware formatters (Intl.DateTimeFormat, Intl.NumberFormat)

     7. Reusable Component Inventory

     List all reusable components needed:
     - Layout components: AppLayout, Sidebar, Navbar, Footer
     - Form components: Input, Select, Textarea, Checkbox, DatePicker, FilePicker
     - Data display: Table, Card, Badge, StatusLabel, AmountDisplay
     - Feedback components: Alert, Toast/Notification, Modal, ConfirmDialog, LoadingSpinner
     - Navigation components: Breadcrumbs, Pagination, LanguageSwitcher

     For each component, specify:
     - Props interface
     - Variants (if applicable)
     - Accessibility requirements (ARIA labels, keyboard navigation)

     8. Edge Cases & Acceptance Criteria

     Document edge cases and validation for:
     - Attachment upload: File size validation (5MB/10MB - clarify), file type validation, max 5 files, cannot delete last attachment
     - Transaction approval: Must have at least 1 attachment, cannot approve already approved/rejected transaction
     - Transaction rejection: Reason required (10-500 chars), cannot reject already approved/rejected transaction
     - Form submissions: Handle loading states, prevent double-submission, show validation errors inline
     - Token expiry: Handle mid-session token expiry gracefully with refresh
     - Deactivated user: Show message, prevent login, force logout if deactivated during session
     - Rate limiting: Show countdown timer or message after 5 failed login attempts
     - Pagination: Handle edge cases (page out of bounds, empty results)
     - Date ranges: Validate fromDate <= toDate, prevent future dates if not allowed

     9. Corrections & Removed Requests (Backend-Driven)

     After analyzing the backend contract, document here:
     - Any requested features NOT supported by backend (and what was done - corrected or removed)
     - Any conflicts with backend validation rules (and how they were corrected)
     - Any invented endpoints or behaviors that were removed

     Example format:
     CORRECTED:
     - Originally requested "bulk approve" feature for multiple transactions at once
       → Backend does not support bulk operations; changed to single-transaction approval UI

     REMOVED:
     - Transaction editing by SALES users after submission
       → Backend only allows updates to PENDING transactions and may restrict this to ADMIN; clarified based on controller review

     VERIFIED:
     - Attachment file size limit discrepancy: OpenAPI says 10MB, but review src/attachments/attachments.service.ts and file upload middleware to
     confirm actual limit

     Phase 4: Output Format

     Provide your deliverables in the following structure:

     # Next.js Frontend Specification: Bright Code Cashflow Dashboard

     ## 1. Backend Contract Summary
     [Endpoint inventory from OpenAPI + controller verification]

     ## 2. Known Differences Between OpenAPI & Controllers
     [List any discrepancies found]

     ## 3. Corrections & Removed Requests (Backend-Driven)
     [Document corrections and removals per Critical Alignment Rule]

     ## 4. Sitemap & Routes
     [Next.js route structure]

     ## 5. Role-Based Navigation
     [Navigation menu for each role]

     ## 6. Page-by-Page Requirements
     [Detailed spec for each page as described above]

     ## 7. API Call Mapping
     [Complete table of user actions → API calls]

     ## 8. Authentication & Token Management
     [Token storage, refresh, logout strategy]

     ## 9. i18n & RTL/LTR Strategy
     [Translation and layout direction approach]

     ## 10. Reusable Component Inventory
     [List of components with props interfaces]

     ## 11. Edge Cases & Acceptance Criteria
     [Edge case handling and validation rules]

     ## 12. Implementation Verification Plan
     [How to test the frontend works correctly with backend]

     Phase 5: Verification & Validation

     After completing the specification, you must:

     1. Cross-reference every frontend feature with backend endpoints: Ensure no orphaned features exist.
     2. Validate all form field requirements: Match backend validation rules exactly (min/max length, required fields, format, allowed values).
     3. Verify role restrictions: Ensure frontend correctly hides/disables features based on user role matching backend permissions.
     4. Check attachment rules: Confirm frontend enforces minimum 1 attachment and prevents deleting last attachment.
     5. Confirm status transition logic: Frontend must only allow PENDING → APPROVED/REJECTED, never allow editing approved/rejected transactions.

     Important Notes

     - Do NOT proceed with implementation code. This task is to generate the specification and plan ONLY.
     - Ask clarifying questions if you encounter ambiguities in the backend contract or need to choose between multiple valid approaches.
     - Be thorough but realistic: Do not over-engineer. Match backend capabilities exactly without adding unnecessary complexity.
     - English only: All documentation, variable names, comments in English.

     ---
     END OF PROMPT

● Task: Generate Next.js Frontend Specification for Bright Code Cashflow Dashboard

  Critical Alignment Rule (Mandatory)

  The backend is the single source of truth. You must strictly adhere to these rules:

  1. If a requested frontend feature is NOT supported by the backend: Either correct it to the closest supported behavior OR remove it from scope entirely.
  2. If requested behavior conflicts with backend rules: (status transitions, permissions, required fields, validations, attachment requirements, etc.), you MUST correct the request to match the backend exactly.
  3. Do NOT invent endpoints or backend behavior. Only use what exists in the backend contract.
  4. Document all corrections: Create a section called "Corrections & Removed Requests (Backend-Driven)" listing any features that were corrected or removed due to backend constraints.

  Phase 1: Backend Contract Discovery (Mandatory First Step)

  Before designing any frontend feature, you MUST:

  1. Read the OpenAPI contract: Located at specs/001-cashflow-backend/contracts/openapi.yaml
  2. List all discovered endpoints: Create a complete inventory with method, path, operation ID, required auth, and role restrictions.
  3. Verify against actual controllers: Read these controller files to identify any discrepancies:
    - src/auth/auth.controller.ts
    - src/users/users.controller.ts
    - src/transactions/transactions.controller.ts
    - src/attachments/attachments.controller.ts
    - src/reports/reports.controller.ts
    - src/audit/audit.controller.ts
  4. Document mismatches: Create a "Known Differences Between OpenAPI & Controllers" section noting any conflicts or missing endpoints.
  5. Read backend documentation: Review docs/frontend-integration/03-api-reference.md for additional backend behavior details, validation rules, and error scenarios.

  Phase 2: System Context & Requirements

  System Overview

  This is an internal admin dashboard (no public pages) for tracking company cashflow. It must be fully mobile-responsive and support bilingual operation.

  Core Backend Rules (Enforced)

  Authentication:
  - JWT-based with access tokens (15-min expiry) and refresh tokens (7-day expiry)
  - Token rotation on refresh (old tokens revoked)
  - Rate limiting: 5 login attempts per 60 seconds
  - Roles: ADMIN and SALES

  Transactions:
  - Types: IN (income) or OUT (expense)
  - Statuses: PENDING → APPROVED or PENDING → REJECTED (immutable once approved/rejected)
  - Transaction number format: BC-YYYY-NNNNNN (auto-generated, cannot be modified)
  - Mandatory attachment rule: Every transaction MUST have at least one receipt/invoice attachment
  - Approval requirement: ADMIN-only action, requires at least one attachment present
  - Rejection requirement: ADMIN-only action, requires rejection reason (10-500 characters)
  - Soft delete: ADMIN-only, requires deletion reason (10-500 characters), transaction remains in database
  - Only APPROVED transactions affect balance and reports

  Attachments:
  - Max file size: 5MB (backend actual implementation) or 10MB (OpenAPI spec - verify which is correct)
  - Allowed formats: JPEG, PNG, PDF (verify against OpenAPI which lists more formats)
  - Max 5 attachments per transaction (backend enforcement)
  - Cannot delete last attachment: Each transaction must always have at least 1 attachment
  - Only uploadable/deletable when transaction status is PENDING

  Categories:
  - OUT (Expenses): DOMAINS, HOSTING, PLUGINS, EMPLOYEES, OTHER (verify against OpenAPI spec)
  - IN (Income): DESIGN, WEBSITES, OTHER (verify against OpenAPI spec)
  - Category must match transaction type (backend validation)

  Permissions:
  - SALES users: Can create transactions, view only their own transactions, upload attachments to their own transactions
  - ADMIN users: Full access - can view all transactions, approve/reject, delete, access reports, manage users, view audit logs

  Timezone:
  - All dates displayed in Africa/Cairo timezone (UTC+2)
  - Daily report grouping uses Africa/Cairo boundaries

  Financial Precision:
  - All monetary values returned as strings (not numbers) to ensure decimal precision
  - Display format: EGP currency with 2 decimal places

  Required Pages (Backend-Supported Only)

  You must verify each page's features against available backend endpoints:

  1. Login Page (/login)
    - Email + password authentication
    - Error handling for invalid credentials, rate limiting, deactivated accounts
    - Remember me functionality (optional, if supported)
  2. Dashboard (/dashboard or /)
    - ADMIN view: Current balance snapshot (total IN, total OUT, net balance), pending approvals count
    - SALES view: Their own pending transactions count, recent activity
    - Quick actions appropriate to role
  3. Transactions Management (/transactions)
    - List view with filtering (status, type, date range, category, search)
    - Pagination (backend supports: page, limit parameters)
    - Create new transaction form (type, amount, category, description)
    - Transaction details view with attachments display
    - Attachment upload UI (drag-drop or file picker, max 5 files)
    - Role-based actions: SALES can edit/delete own PENDING transactions, ADMIN can edit/delete any
  4. Approvals Queue (/approvals - ADMIN only)
    - List of PENDING transactions requiring approval
    - Approve action (requires at least one attachment check)
    - Reject action with reason input (10-500 chars)
    - Bulk approval capability (if supported by backend - verify)
  5. Reports (/reports - ADMIN only)
    - Balance report (current totals from all APPROVED transactions)
    - Period summary report (fromDate, toDate parameters required)
    - Expenses by category report (fromDate, toDate parameters required)
    - Export options: Excel (.xlsx) and CSV (if CSV export endpoint exists - verify)
  6. Users Management (/users - ADMIN only)
    - List users with filtering (role, isActive status)
    - Create new user (email, password, role)
    - Edit user (update role, password, email if supported)
    - Activate/deactivate user accounts
  7. Audit Logs (/audit - ADMIN only)
    - Paginated audit log viewer
    - Filters: date range, actor user, entity type, action type
    - Display: timestamp, actor, action, entity type, before/after snapshots, IP address

  Technical Requirements

  Framework & Architecture:
  - Next.js 14+ with App Router (preferred) or Pages Router
  - TypeScript for type safety
  - Server-side rendering (SSR) or Static Site Generation (SSG) where appropriate
  - Client-side rendering for dynamic data fetching

  Internationalization (i18n):
  - Support Arabic (ar) and English (en)
  - Default language: Arabic
  - RTL layout for Arabic, LTR layout for English
  - Language switcher in navbar/header
  - All UI text must be translatable (no hardcoded strings)
  - Date/time formatting per locale

  Styling & Responsiveness:
  - Fully mobile-responsive (mobile-first design)
  - Support for both RTL and LTR layouts
  - Consistent design system (colors, typography, spacing)
  - Recommendation: Tailwind CSS with RTL support or Material-UI with direction support

  State Management:
  - Authentication state (access token, refresh token, user info)
  - Global UI state (language, theme if applicable)
  - Server state caching (React Query, SWR, or similar)

  API Integration:
  - Base URL: http://localhost:3000 (development) - configurable via environment variable
  - Authorization header: Bearer {accessToken} for all protected endpoints
  - Automatic token refresh when access token expires (401 response handler)
  - Logout on refresh token failure or user deactivation
  - Error handling for all HTTP status codes (400, 401, 403, 404, 409, 429, 500)

  Phase 3: Required Deliverables

  You must produce the following specification documents:

  1. Sitemap & Routes

  - Complete route structure using Next.js App Router conventions
  - Public vs. protected routes
  - Role-based route access (ADMIN-only routes, SALES-accessible routes)
  - Redirect logic (e.g., authenticated users redirected from /login to /dashboard)

  2. Role-Based Navigation

  - Navigation menu structure for ADMIN users
  - Navigation menu structure for SALES users
  - Active route highlighting
  - Logout button placement

  3. Page-by-Page Requirements

  For each page, provide:
  - Page purpose & description
  - URL route & parameters
  - Required backend endpoints (list method + path + operation ID)
  - UI layout & components (header, filters, table/cards, forms, modals)
  - Form fields with validation rules (match backend validation: min/max length, required fields, format)
  - Display fields & formatting (dates in Africa/Cairo, amounts as strings with 2 decimals, transaction numbers)
  - User interactions & state changes (button clicks, form submissions, filter changes)
  - Loading states (skeleton loaders, spinners)
  - Empty states (no data messages)
  - Error states (form validation errors, API error messages)
  - Role-based visibility (what SALES vs ADMIN can see/do)

  4. API Call Mapping

  Create a table mapping each user action to backend API calls:
  User Action: Login
  Page: /login
  HTTP Method: POST
  Endpoint: /auth/login
  Request Body/Params: {email, password}
  Success Response: {accessToken, refreshToken, user}
  Error Handling: 401 → show error, 429 → rate limit message
  ────────────────────────────────────────
  User Action: ...
  Page: ...
  HTTP Method: ...
  Endpoint: ...
  Request Body/Params: ...
  Success Response: ...
  Error Handling: ...
  5. Authentication & Token Management

  - Token storage strategy: Where to store access token (memory, sessionStorage) and refresh token (httpOnly cookie preferred, or localStorage)
  - Token refresh flow: When to refresh (proactive before expiry vs. reactive on 401)
  - Automatic retry logic: Retry failed requests after token refresh
  - Logout flow: Call /auth/logout endpoint, clear tokens, redirect to login
  - Protected route guards: HOC or middleware to check authentication and role

  6. i18n & RTL/LTR Strategy

  - i18n library: Recommendation (e.g., next-i18next, react-i18next)
  - Translation file structure: /locales/{lang}/{namespace}.json
  - RTL/LTR switching: CSS direction attribute, layout adjustments
  - Date/number formatting: Use locale-aware formatters (Intl.DateTimeFormat, Intl.NumberFormat)

  7. Reusable Component Inventory

  List all reusable components needed:
  - Layout components: AppLayout, Sidebar, Navbar, Footer
  - Form components: Input, Select, Textarea, Checkbox, DatePicker, FilePicker
  - Data display: Table, Card, Badge, StatusLabel, AmountDisplay
  - Feedback components: Alert, Toast/Notification, Modal, ConfirmDialog, LoadingSpinner
  - Navigation components: Breadcrumbs, Pagination, LanguageSwitcher

  For each component, specify:
  - Props interface
  - Variants (if applicable)
  - Accessibility requirements (ARIA labels, keyboard navigation)

  8. Edge Cases & Acceptance Criteria

  Document edge cases and validation for:
  - Attachment upload: File size validation (5MB/10MB - clarify), file type validation, max 5 files, cannot delete last attachment
  - Transaction approval: Must have at least 1 attachment, cannot approve already approved/rejected transaction
  - Transaction rejection: Reason required (10-500 chars), cannot reject already approved/rejected transaction
  - Form submissions: Handle loading states, prevent double-submission, show validation errors inline
  - Token expiry: Handle mid-session token expiry gracefully with refresh
  - Deactivated user: Show message, prevent login, force logout if deactivated during session
  - Rate limiting: Show countdown timer or message after 5 failed login attempts
  - Pagination: Handle edge cases (page out of bounds, empty results)
  - Date ranges: Validate fromDate <= toDate, prevent future dates if not allowed

  9. Corrections & Removed Requests (Backend-Driven)

  After analyzing the backend contract, document here:
  - Any requested features NOT supported by backend (and what was done - corrected or removed)
  - Any conflicts with backend validation rules (and how they were corrected)
  - Any invented endpoints or behaviors that were removed

  Example format:
  CORRECTED:
  - Originally requested "bulk approve" feature for multiple transactions at once
    → Backend does not support bulk operations; changed to single-transaction approval UI

  REMOVED:
  - Transaction editing by SALES users after submission
    → Backend only allows updates to PENDING transactions and may restrict this to ADMIN; clarified based on controller review

  VERIFIED:
  - Attachment file size limit discrepancy: OpenAPI says 10MB, but review src/attachments/attachments.service.ts and file upload middleware to confirm actual limit

  Phase 4: Output Format

  Provide your deliverables in the following structure:

  # Next.js Frontend Specification: Bright Code Cashflow Dashboard

  ## 1. Backend Contract Summary
  [Endpoint inventory from OpenAPI + controller verification]

  ## 2. Known Differences Between OpenAPI & Controllers
  [List any discrepancies found]

  ## 3. Corrections & Removed Requests (Backend-Driven)
  [Document corrections and removals per Critical Alignment Rule]

  ## 4. Sitemap & Routes
  [Next.js route structure]

  ## 5. Role-Based Navigation
  [Navigation menu for each role]

  ## 6. Page-by-Page Requirements
  [Detailed spec for each page as described above]

  ## 7. API Call Mapping
  [Complete table of user actions → API calls]

  ## 8. Authentication & Token Management
  [Token storage, refresh, logout strategy]

  ## 9. i18n & RTL/LTR Strategy
  [Translation and layout direction approach]

  ## 10. Reusable Component Inventory
  [List of components with props interfaces]

  ## 11. Edge Cases & Acceptance Criteria
  [Edge case handling and validation rules]

  ## 12. Implementation Verification Plan
  [How to test the frontend works correctly with backend]

  Phase 5: Verification & Validation

  After completing the specification, you must:

  1. Cross-reference every frontend feature with backend endpoints: Ensure no orphaned features exist.
  2. Validate all form field requirements: Match backend validation rules exactly (min/max length, required fields, format, allowed values).
  3. Verify role restrictions: Ensure frontend correctly hides/disables features based on user role matching backend permissions.
  4. Check attachment rules: Confirm frontend enforces minimum 1 attachment and prevents deleting last attachment.
  5. Confirm status transition logic: Frontend must only allow PENDING → APPROVED/REJECTED, never allow editing approved/rejected transactions.

  Important Notes

  - Do NOT proceed with implementation code. This task is to generate the specification and plan ONLY.
  - Ask clarifying questions if you encounter ambiguities in the backend contract or need to choose between multiple valid approaches.
  - Be thorough but realistic: Do not over-engineer. Match backend capabilities exactly without adding unnecessary complexity.
  - English only: All documentation, variable names, comments in English.