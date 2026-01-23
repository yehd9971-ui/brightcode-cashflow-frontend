# Project Tasks

## Completed Features

### Customer Details for Transactions
- **Date:** January 21, 2026
- **Description:** Added optional customer name and phone number fields to transactions
- **Changes:**
  - Updated `CreateTransactionDto` and `TransactionResponseDto` types in `src/types/api.ts`
  - Added validation rules for `customerName` (max 100 chars) and `phoneNumber` (format validation)
  - Added form fields to `/transactions/new` page
  - Updated transaction service to send new fields to API
  - Added display in `/transactions/[id]` details page

### Expense Creation Restriction
- **Date:** January 21, 2026
- **Description:** Restricted OUT (expense) transaction creation to ADMIN role only
- **Changes:**
  - Updated transaction form to disable OUT button for SALES users
  - Added "(Admin only)" label to OUT button for SALES users
  - Changed default transaction type to IN (income) for all users
  - Added client-side validation in transaction service to reject OUT from SALES
  - SALES users can only create IN (income) transactions

### Admin User Protection UI
- **Date:** January 21, 2026
- **Description:** Hide deactivate button for ADMIN users in User Management
- **Changes:**
  - Modified Users table Actions column to check user role
  - ADMIN users show a Lock icon instead of deactivate/activate button
  - Lock icon has tooltip "Admin accounts are protected"
  - SALES users still show deactivate/activate buttons as before

### Admin Role Protection UI
- **Date:** January 21, 2026
- **Description:** Disable Role dropdown when editing ADMIN users
- **Changes:**
  - Modified Edit User modal to disable Role field for ADMIN users
  - Added helper text "Admin role cannot be changed"
  - SALES users can still have their role modified

### Comprehensive Branding Update
- **Date:** January 21, 2026
- **Description:** Updated application branding with official logo
- **Changes:**
  - Added logo to `public/logo.png` for use throughout the app
  - Set favicon using `src/app/icon.png` (Next.js App Router convention)
  - Updated Sidebar to display logo image instead of "BC" placeholder
  - Logo displays in browser tab and sidebar navigation

### Transaction Export Feature
- **Date:** January 21, 2026
- **Description:** Added export functionality to Transactions page
- **Changes:**
  - Added "Export CSV" and "Export Excel" buttons with outline styling
  - Added export service functions for CSV and Excel endpoints
  - Exports respect current filters (type, status, category, search)
  - Shows loading state ("Exporting...") during download
  - Downloads file with date-stamped filename (e.g., transactions-2026-01-21.csv)
