// types/api.ts
// Auto-generated TypeScript types for BrightCode Cashflow API
// Last updated: 2026-01-20 (Africa/Cairo)
// Note: All monetary values are strings for decimal precision

// ============================================================================
// ENUMS
// ============================================================================

export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  SALES_MANAGER = 'SALES_MANAGER',
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TransactionCategory {
  WEBSITES = 'WEBSITES',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  HOSTING = 'HOSTING',
  SOFTWARE = 'SOFTWARE',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  SALARIES = 'SALARIES',
  OTHER = 'OTHER',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REFRESH = 'REFRESH',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELETE = 'DELETE',
  UPLOAD = 'UPLOAD',
  DEACTIVATE = 'DEACTIVATE',
  ACTIVATE = 'ACTIVATE',
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  CALL_CREATE = 'CALL_CREATE',
  CALL_UPDATE = 'CALL_UPDATE',
  CALL_APPROVE = 'CALL_APPROVE',
  CALL_REJECT = 'CALL_REJECT',
  TASK_CREATE = 'TASK_CREATE',
  TASK_COMPLETE = 'TASK_COMPLETE',
  TASK_REJECT = 'TASK_REJECT',
  TASK_OVERDUE = 'TASK_OVERDUE',
  REPORT_GENERATE = 'REPORT_GENERATE',
}

export enum EntityType {
  USER = 'USER',
  TRANSACTION = 'TRANSACTION',
  ATTACHMENT = 'ATTACHMENT',
  ATTENDANCE = 'ATTENDANCE',
  CALL = 'CALL',
  CALL_TASK = 'CALL_TASK',
  DAILY_CALL_REPORT = 'DAILY_CALL_REPORT',
}

// ============================================================================
// CALL TRACKING ENUMS
// ============================================================================

export enum CallStatus {
  ANSWERED = 'ANSWERED',
  NOT_ANSWERED = 'NOT_ANSWERED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum CallApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CallTaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  OVERDUE = 'OVERDUE',
}

export enum CallTaskSource {
  MANUAL_SALES = 'MANUAL_SALES',
  MANUAL_MANAGER = 'MANUAL_MANAGER',
  FOLLOW_UP = 'FOLLOW_UP',
  FOLLOW_UP_AUTO = 'FOLLOW_UP_AUTO',
}

export enum OpenTaskBucket {
  OVERDUE = 'overdue',
  TODAY = 'today',
  UPCOMING = 'upcoming',
  ALL = 'all',
}

// ============================================================================
// SALARY & DEDUCTIONS ENUMS
// ============================================================================

export enum WeeklyOffDay {
  FRIDAY = 'FRIDAY',
  MONDAY = 'MONDAY',
}

export enum DayStatus {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  ABSENT = 'ABSENT',
  LEAVE_PAID = 'LEAVE_PAID',
  LEAVE_UNPAID = 'LEAVE_UNPAID',
  ABSENT_UNEXCUSED = 'ABSENT_UNEXCUSED',
}

export enum DeductionType {
  ABSENCE_UNEXCUSED = 'ABSENCE_UNEXCUSED',
  MISSING_CALLS = 'MISSING_CALLS',
  MANUAL = 'MANUAL',
  LATE_REPORT = 'LATE_REPORT',
}

export enum BonusType {
  MANUAL = 'MANUAL',
  COMMISSION = 'COMMISSION',
}

// ============================================================================
// NUMBER/CRM ENUMS
// ============================================================================

export enum LeadStatus {
  NEW = 'NEW',
  INTERESTED = 'INTERESTED',
  HOT_LEAD = 'HOT_LEAD',
  FOLLOWING_UP = 'FOLLOWING_UP',
  SOLD = 'SOLD',
  NOT_INTERESTED = 'NOT_INTERESTED',
}

export enum CrmStage {
  NEW = 'NEW',
  NOT_ANSWERED = 'NOT_ANSWERED',
  INTERESTED = 'INTERESTED',
  HOT_LEAD = 'HOT_LEAD',
  FOLLOWING_UP = 'FOLLOWING_UP',
  SOLD = 'SOLD',
  NOT_INTERESTED = 'NOT_INTERESTED',
}

export enum NumberPoolStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  RESERVED = 'RESERVED',
  ARCHIVED = 'ARCHIVED',
  COOLING_DOWN = 'COOLING_DOWN',
  FROZEN = 'FROZEN',
}

// ============================================================================
// SALES STATUS ENUM
// ============================================================================

export enum SalesStatus {
  AVAILABLE = 'AVAILABLE',
  ON_CALL = 'ON_CALL',
}

export enum FollowUpStatus {
  PENDING_FOLLOWUP = 'PENDING_FOLLOWUP',
  COMPLETED_FOLLOWUP = 'COMPLETED_FOLLOWUP',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// LEAVE ENUMS
// ============================================================================

export enum LeaveStatus {
  PENDING_LEAVE = 'PENDING_LEAVE',
  APPROVED_PAID = 'APPROVED_PAID',
  APPROVED_UNPAID = 'APPROVED_UNPAID',
  REJECTED_LEAVE = 'REJECTED_LEAVE',
}

// ============================================================================
// DEAL ENUMS
// ============================================================================

export enum DealStatus {
  PENDING_DEAL = 'PENDING_DEAL',
  APPROVED_DEAL = 'APPROVED_DEAL',
  CLOSED = 'CLOSED',
  LOST = 'LOST',
  REJECTED_DEAL = 'REJECTED_DEAL',
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  isModerator?: boolean;
  baseSalary?: string;
  weeklyOffDay?: WeeklyOffDay;
  createdAt: string;
  updatedAt: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponseDto;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface CreateUserDto {
  email: string;
  password: string;
  role?: Role;
  baseSalary?: number;
  weeklyOffDay?: WeeklyOffDay;
}

export interface UpdateUserDto {
  role?: Role;
  isActive?: boolean;
  password?: string;
  baseSalary?: number;
  weeklyOffDay?: WeeklyOffDay;
  isModerator?: boolean;
}

export interface UserQueryDto {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  description: string;
  category?: TransactionCategory;
  customerName?: string;
  phoneNumber?: string;
  clientId?: string;
}

export interface UpdateTransactionDto {
  type?: TransactionType;
  amount?: number;
  description?: string;
  category?: TransactionCategory;
}

export interface RejectTransactionDto {
  reason: string;
}

export interface DeleteTransactionDto {
  reason: string;
}

export interface TransactionQueryDto {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  createdById?: string;
  createdByRole?: Role;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  category?: TransactionCategory;
  includeDeleted?: boolean;
}

export interface TransactionUserDto {
  id: string;
  email: string;
  role: Role;
}

export interface AttachmentResponseDto {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface TransactionResponseDto {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  amount: string; // String for decimal precision
  description: string;
  category: string;
  status: TransactionStatus;
  rejectionReason?: string;
  customerName?: string;
  phoneNumber?: string;
  createdBy: TransactionUserDto;
  approvedBy?: TransactionUserDto;
  attachments: AttachmentResponseDto[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ReportQueryDto {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;
  createdById?: string;
  createdByRole?: Role;
}

export interface SummaryDto {
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  netCashflow: string; // String for precision
  countIn: number;
  countOut: number;
  totalCount: number;
}

export interface DailyTotalDto {
  date: string; // Africa/Cairo timezone
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  net: string; // String for precision
}

export interface ReportResponseDto {
  summary: SummaryDto;
  dailyTotals: DailyTotalDto[];
  generatedAt: string;
  startDate?: string;
  endDate?: string;
  currency: string;
}

export interface BalanceResponseDto {
  totalIn: string; // String for precision
  totalOut: string; // String for precision
  netBalance: string; // String for precision
  currency: string;
  asOf: string;
}

export interface CategoryExpenseDto {
  category: string;
  total: string; // String for precision
  count: number;
}

export interface ExpensesByCategoryResponseDto {
  fromDate?: string;
  toDate?: string;
  categories: CategoryExpenseDto[];
  grandTotal: string; // String for precision
  currency: string;
}

export interface SalesMemberReportDto {
  userId: string;
  email: string;
  totalIn: string;
  totalOut: string;
  netCashflow: string;
  countIn: number;
  countOut: number;
  totalCount: number;
}

export interface SalesComparisonResponseDto {
  members: SalesMemberReportDto[];
  totals: SummaryDto;
  generatedAt: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  currency: string;
}

export interface CrmReportQueryDto {
  ownerId?: string;
  priority?: number;
  stage?: CrmStage;
  staleDays?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CrmReportCardsDto {
  overdueTasks: number;
  hotLeads: number;
  staleLeads: number;
  hotLeadsWithoutFollowUp: number;
  averageCompletionHours: number;
  hotLeadConversionRate: number;
}

export interface CrmEmployeeMetricDto {
  userId: string;
  email: string;
  count: number;
}

export interface CrmAverageCompletionMetricDto {
  userId: string;
  email: string;
  completedTasks: number;
  averageHours: number;
}

export interface CrmLeadReportRowDto {
  id: string;
  phoneNumber: string;
  clientName?: string;
  stage: CrmStage;
  ownerEmail?: string;
  priority?: number;
  nextActionAt?: string;
  lastContactedAt?: string;
}

export interface CrmStaleStageMetricDto {
  stage: CrmStage;
  count: number;
}

export interface CrmHotLeadConversionDto {
  hotLeadCount: number;
  soldFromHotLeadCount: number;
  conversionRate: number;
}

export interface CrmExportRowDto {
  type: string;
  label: string;
  ownerEmail?: string;
  phoneNumber?: string;
  stage?: string;
  value?: string | number;
}

export interface CrmReportResponseDto {
  cards: CrmReportCardsDto;
  overdueByEmployee: CrmEmployeeMetricDto[];
  averageCompletionByEmployee: CrmAverageCompletionMetricDto[];
  hotLeadsWithoutFollowUp: CrmLeadReportRowDto[];
  staleLeadsByStage: CrmStaleStageMetricDto[];
  hotLeadConversion: CrmHotLeadConversionDto;
  exportRows: CrmExportRowDto[];
  generatedAt: string;
  page: number;
  limit: number;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface AuditQueryDto {
  page?: number;
  limit?: number;
  entityType?: EntityType;
  entityId?: string;
  actorId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

export interface AuditActorDto {
  id: string;
  email: string;
}

export interface AuditLogResponseDto {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  actor?: AuditActorDto;
  ipAddress?: string;
  timestamp: string;
}

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

export interface AttendanceSessionResponseDto {
  id: string;
  userId: string;
  userEmail: string;
  clockIn: string;
  clockOut?: string;
  autoClosedAt?: string;
  durationMinutes?: number;
}

export interface AttendanceQueryDto {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface DailyAttendanceDto {
  email: string;
  date: string;
  totalMinutes: number;
  sessionsCount: number;
}

export interface AttendanceSummaryResponseDto {
  dailyBreakdown: DailyAttendanceDto[];
  totalMinutes: number;
  totalHoursFormatted: string;
  totalDaysWorked: number;
  averageMinutesPerDay: number;
}

// ============================================================================
// CALL TRACKING TYPES
// ============================================================================

export interface CallScreenshotDto {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  fileHash?: string;
  duplicateInstances?: {
    callId: string;
    clientPhoneNumber: string;
    dateEgypt: string;
    userEmail: string;
  }[];
}

export interface CallUserDto {
  id: string;
  email: string;
  role: Role;
}

export interface CallResponseDto {
  id: string;
  userId: string;
  clientPhoneNumber: string;
  rawPhoneNumber: string;
  callStatus: CallStatus;
  approvalStatus: CallApprovalStatus;
  durationMinutes?: number;
  notes?: string;
  dateEgypt: string;
  isCounted: boolean;
  supersededByCallId?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  screenshot?: CallScreenshotDto;
  user: CallUserDto;
  approvedBy?: CallUserDto;
  callStartedAt?: string;
  lateReportPenalty?: number;
  lateReportDelayMinutes?: number;
  lateReportPenaltyMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallDto {
  clientPhoneNumber: string;
  callStatus: CallStatus;
  durationMinutes?: number;
  notes?: string;
}

export interface UpdateCallDto {
  clientPhoneNumber?: string;
  callStatus?: CallStatus;
  durationMinutes?: number;
  notes?: string;
}

export interface CallQueryDto {
  page?: number;
  limit?: number;
  date?: string;
  userId?: string;
  callStatus?: CallStatus;
  approvalStatus?: CallApprovalStatus;
  phoneNumber?: string;
  showSuperseded?: boolean;
}

export interface RejectCallDto {
  reason: string;
}

export interface CallTaskResponseDto {
  id: string;
  userId: string;
  clientPhoneNumber: string;
  rawPhoneNumber: string;
  taskDate: string;
  taskTime: string;
  scheduledAt: string;
  status: CallTaskStatus;
  source: CallTaskSource;
  notes?: string;
  createdByUserId: string;
  completedByCallId?: string;
  sourceCallId?: string;
  rejectedByUserId?: string;
  rejectionReason?: string;
  clientNumberId?: string;
  followUpId?: string;
  completedAt?: string;
  closedAt?: string;
  closedReason?: string;
  user: CallUserDto;
  createdBy: CallUserDto;
  createdAt: string;
  updatedAt: string;
}

export interface OpenTaskClientNumberDto {
  id: string;
  phoneNumber: string;
  clientName?: string;
  crmStage?: CrmStage;
  priority?: number;
  nextActionAt?: string;
}

export interface OpenTaskResponseDto extends CallTaskResponseDto {
  bucket: OpenTaskBucket;
  isOverdue: boolean;
  clientNumber?: OpenTaskClientNumberDto;
}

export interface OpenTasksResponseDto {
  data: OpenTaskResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCallTaskDto {
  clientPhoneNumber: string;
  taskDate: string;
  taskTime: string;
  userId?: string;
  notes?: string;
  sourceCallId?: string;
}

export interface CallTaskQueryDto {
  page?: number;
  limit?: number;
  date?: string;
  userId?: string;
  status?: CallTaskStatus;
  phoneNumber?: string;
}

export interface OpenTasksQueryDto {
  page?: number;
  limit?: number;
  bucket?: OpenTaskBucket;
  userId?: string;
  phoneNumber?: string;
  clientNumberId?: string;
  source?: CallTaskSource;
  priority?: number;
  includeCompleted?: boolean;
}

export interface CrmUserSummaryDto {
  id: string;
  email: string;
  role?: Role;
}

export interface CrmTaskSummaryDto {
  id: string;
  userId: string;
  clientPhoneNumber: string;
  taskDate: string;
  taskTime: string;
  scheduledAt: string;
  status: CallTaskStatus;
  source: CallTaskSource;
  notes?: string;
  completedAt?: string;
  closedAt?: string;
  closedReason?: string;
}

export interface CrmCallSummaryDto {
  id: string;
  callStatus: CallStatus;
  clientPhoneNumber: string;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
  callStartedAt?: string;
  user?: CrmUserSummaryDto;
}

export interface CrmFollowUpSummaryDto {
  id: string;
  userId: string;
  scheduledDate: string;
  followUpNumber: number;
  status: FollowUpStatus;
  completedAt?: string;
  createdAt: string;
}

export interface CrmLeadResponseDto {
  id: string;
  phoneNumber: string;
  normalizedPhone: string;
  clientName?: string;
  source?: string;
  interests?: string;
  stage: CrmStage;
  crmStage?: CrmStage;
  leadStatus: LeadStatus;
  poolStatus: NumberPoolStatus;
  owner?: CrmUserSummaryDto;
  currentAssigneeId?: string;
  priority?: number;
  lastContactedAt?: string;
  nextActionAt?: string;
  nextActionType?: string;
  lostReason?: string;
  totalFailedAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextOpenTask?: CrmTaskSummaryDto;
  lastCall?: CrmCallSummaryDto;
  timelinePreview: Array<{ id: string; type: string; title: string; occurredAt: string }>;
}

export interface CrmLeadDetailResponseDto extends CrmLeadResponseDto {
  notes?: string;
  client?: { id: string; name: string };
  recentTasks: CrmTaskSummaryDto[];
  followUps: CrmFollowUpSummaryDto[];
}

export interface CrmTimelineItemDto {
  id: string;
  type: 'activity' | 'call' | 'task' | 'follow_up' | string;
  event: string;
  rawAction?: string;
  title: string;
  details?: Record<string, unknown>;
  occurredAt: string;
  occurredAtEgypt: string;
  actor?: CrmUserSummaryDto;
  user?: CrmUserSummaryDto;
}

export interface CrmTimelineResponseDto {
  data: CrmTimelineItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CrmLeadsResponseDto {
  data: CrmLeadResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  countsByStage: Record<CrmStage, number>;
}

export interface CrmLeadsQueryDto {
  page?: number;
  limit?: number;
  stage?: CrmStage;
  ownerId?: string;
  priority?: number;
  search?: string;
  stale?: boolean;
  staleDays?: number;
  nextAction?: 'overdue' | 'today' | 'upcoming' | 'none' | 'all';
  sortBy?: 'updatedAt' | 'createdAt' | 'lastContactedAt' | 'nextActionAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateCrmLeadStageDto {
  stage: CrmStage;
  priority?: number;
  lostReason?: string;
  nextActionAt?: string;
  nextActionType?: string;
}

export interface CreateCrmLeadTaskDto {
  taskDate: string;
  taskTime: string;
  userId?: string;
  notes?: string;
}

export interface CrmTimelineQueryDto {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  eventType?: string;
}

export interface DailyCallStatsDto {
  totalCalls: number;
  answeredCalls: number;
  totalTalkMinutes: number;
  approvedCalls: number;
  conditionAProgress: number;
  conditionBProgress: number;
  completionPercent: number;
  pendingCalls: number;
  rejectedCalls: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dynamicCallTarget: number;
}

export interface EmployeeDailyStatsDto {
  userId: string;
  email: string;
  isModerator?: boolean;
  stats: DailyCallStatsDto;
}

export interface DashboardStatsResponseDto {
  date: string;
  employees: EmployeeDailyStatsDto[];
}

export interface DailyCallReportDto {
  id: string;
  userId: string;
  dateEgypt: string;
  totalCalls: number;
  answeredCalls: number;
  totalTalkMinutes: number;
  approvedCalls: number;
  conditionAProgress: number;
  conditionBProgress: number;
  completionPercent: number;
  pendingCalls: number;
  rejectedCalls: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dynamicCallTarget: number;
  generatedAt: string;
  user: CallUserDto;
}

// ============================================================================
// SALARY TYPES
// ============================================================================

export interface DailyWorkRecordDto {
  id: string;
  userId: string;
  dateEgypt: string;
  totalMinutes: number;
  dayStatus: DayStatus;
  dayPercentage: number;
  salaryEarned: string;
  callDeduction: string;
  adminOverride: boolean;
  adminNotes?: string;
}

export interface SalaryDeductionDto {
  id: string;
  userId: string;
  dateEgypt: string;
  type: DeductionType;
  amount: string;
  description: string;
  createdByUserId: string;
  createdAt: string;
}

export interface SalaryBonusDto {
  id: string;
  userId: string;
  month: number;
  year: number;
  type: BonusType;
  amount: string;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface MonthlySalaryResponseDto {
  userId: string;
  month: number;
  year: number;
  baseSalary: string;
  dailyRecords: DailyWorkRecordDto[];
  totalDaysWorked: number;
  totalEarned: string;
  totalCallDeductions: string;
  totalAbsenceDeductions: string;
  totalManualDeductions: string;
  totalLateReportDeductions: string;
  totalBonuses: string;
  totalCommission: string;
  netSalary: string;
  deductions: SalaryDeductionDto[];
  bonuses: SalaryBonusDto[];
}

export interface EmployeeSalaryOverviewDto {
  userId: string;
  email: string;
  baseSalary: string;
  totalEarned: string;
  totalDeductions: string;
  totalBonuses: string;
  netSalary: string;
  daysWorked: number;
}

export interface CreateDeductionDto {
  userId: string;
  amount: number;
  description: string;
  dateEgypt: string;
}

export interface OverrideDayRecordDto {
  dayPercentage: number;
  adminNotes?: string;
}

// ============================================================================
// CLIENT NUMBER / CRM TYPES
// ============================================================================

export interface ClientNumberDto {
  id: string;
  phoneNumber: string;
  normalizedPhone: string;
  clientName?: string;
  source?: string;
  interests?: string;
  leadStatus: LeadStatus;
  crmStage?: CrmStage;
  lastContactedAt?: string;
  nextActionAt?: string;
  nextActionType?: string;
  lostReason?: string;
  priority?: number;
  currentAssigneeId?: string;
  assignmentType?: string;
  poolStatus: NumberPoolStatus;
  totalFailedAttempts: number;
  cooldownUntil?: string;
  frozenUntil?: string;
  firstCallPendingByUserId?: string;
  firstCallDate?: string;
  lastAttemptDate?: string;
  lastAnsweredDate?: string;
  clientId?: string;
  enteredByUserId: string;
  notes?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  leadStatusChangedAt?: string;
  currentAssignee?: { id: string; email: string };
  enteredBy?: { id: string; email: string };
  client?: { id: string; name: string };
}

export interface FollowUpDto {
  id: string;
  clientNumberId: string;
  userId: string;
  scheduledDate: string;
  followUpNumber: number;
  status: FollowUpStatus;
  completedAt?: string;
  createdAt: string;
}

export interface NumberActivityLogDto {
  id: string;
  clientNumberId: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; email: string };
}

export interface PoolStatsDto {
  available: number;
  assigned: number;
  reserved: number;
  archived: number;
  coolingDown: number;
  frozen: number;
  total: number;
}

export interface AddNumberDto {
  phoneNumber: string;
  clientName?: string;
  source?: string;
  interests?: string;
  notes?: string;
}

export interface BulkImportDto {
  numbers: Array<{ phoneNumber: string; clientName?: string; source?: string }>;
}

export interface BulkImportResponseDto {
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface UpdateLeadStatusDto {
  leadStatus: LeadStatus;
}

export interface NumberQueryDto {
  page?: number;
  limit?: number;
  poolStatus?: NumberPoolStatus;
  leadStatus?: LeadStatus;
  assigneeId?: string;
}

// ============================================================================
// LEAVE TYPES
// ============================================================================

export interface LeaveRequestDto {
  id: string;
  userId: string;
  leaveDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string };
  approvedBy?: { id: string; email: string };
}

export interface CreateLeaveDto {
  leaveDate: string;
  reason?: string;
}

export interface ApproveLeaveDto {
  type: 'PAID' | 'UNPAID';
}

export interface RejectLeaveDto {
  reason: string;
}

export interface LeaveQueryDto {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  userId?: string;
}

// ============================================================================
// DEAL TYPES
// ============================================================================

export interface DealDto {
  id: string;
  phoneNumber: string;
  clientName?: string;
  userId: string;
  amount: string;
  service: string;
  status: DealStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  commissionAmount?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string };
  approvedBy?: { id: string; email: string };
}

export interface CreateDealDto {
  phoneNumber: string;
  clientName?: string;
  clientId?: string;
  amount: number;
  service: string;
  notes?: string;
}

export interface UpdateDealDto {
  phoneNumber?: string;
  clientName?: string;
  clientId?: string;
  amount?: number;
  service?: string;
  notes?: string;
}

export interface RejectDealDto {
  reason: string;
}

export interface DealQueryDto {
  page?: number;
  limit?: number;
  status?: DealStatus;
  userId?: string;
}

export interface DealCommissionDto {
  totalDeals: number;
  totalAmount: string;
  totalCommission: string;
  deals: Array<{
    dealId: string;
    amount: string;
    commission: string;
  }>;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalAmount?: number; // Total sum of transaction amounts (for filtered results)
  totalAmountCount?: number; // Count of transactions included in totalAmount calculation
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: ValidationError[];
  timestamp: string;
  path: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'statusCode' in response &&
    typeof (response as ErrorResponse).statusCode === 'number' &&
    'message' in response &&
    typeof (response as ErrorResponse).message === 'string'
  );
}

export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as PaginatedResponse<T>).data) &&
    'total' in response &&
    typeof (response as PaginatedResponse<T>).total === 'number'
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TransactionList = PaginatedResponse<TransactionResponseDto>;
export type UserList = PaginatedResponse<UserResponseDto>;
export type AuditList = PaginatedResponse<AuditLogResponseDto>;
export type CallList = PaginatedResponse<CallResponseDto>;
export type CallTaskList = PaginatedResponse<CallTaskResponseDto>;
export type LeaveList = PaginatedResponse<LeaveRequestDto>;
export type DealList = PaginatedResponse<DealDto>;
export type ClientNumberList = PaginatedResponse<ClientNumberDto>;
export type ApiResponse<T> = T | ErrorResponse;

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResultDto {
  successCount: number;
  errorCount: number;
  errors: ImportRowError[];
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

// ============================================================================
// CLIENT TYPES
// ============================================================================

export interface ClientDto {
  id: string;
  clientCode: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
  createdByUserId: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; email: string };
  clientNumbers?: ClientNumberDto[];
  websites?: ClientWebsiteDto[];
  transactions?: TransactionResponseDto[];
  deals?: DealDto[];
  balance?: {
    totalDealAmount: number;
    totalPaid: number;
    remainingBalance: number;
    visible: boolean;
  };
}

export interface ClientSearchResult {
  id: string;
  clientCode: string;
  name: string;
  phone?: string;
}

export interface ClientBalanceDto {
  id: string;
  clientCode: string;
  name: string;
  phone?: string;
  totalDealAmount: number;
  totalPaid: number;
  remainingBalance: number;
  services: string[];
}

export interface CreateClientDto {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface UpdateClientDto {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface ClientQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  service?: string;
}

export type ClientList = PaginatedResponse<ClientDto>;

// ============================================================================
// CLIENT WEBSITE TYPES
// ============================================================================

export interface ClientWebsiteDto {
  id: string;
  clientId: string;
  url: string;
  domainRenewalDate?: string;
  notes?: string;
  createdByUserId: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UNKNOWN';
  client?: { id: string; name: string };
  createdBy?: { id: string; email: string };
}

export interface CreateClientWebsiteDto {
  url: string;
  domainRenewalDate?: string;
  notes?: string;
}

export interface UpdateClientWebsiteDto {
  url?: string;
  domainRenewalDate?: string;
  notes?: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export type NotificationList = PaginatedResponse<NotificationDto>;

// ============================================================================
// SALES STATUS TYPES
// ============================================================================

export interface SalesEmployeeStatusDto {
  userId: string;
  email: string;
  currentStatus: SalesStatus | null;
  statusUpdatedAt?: string;
  durationSeconds: number;
}

export interface SalesStatusResponseDto {
  employees: SalesEmployeeStatusDto[];
}

// ============================================================================
// BULK APPROVE TYPES
// ============================================================================

export interface BulkApproveCallsDto {
  callIds?: string[];
  userId?: string;
  all?: boolean;
}

export interface BulkApproveResponseDto {
  approved: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// NUMBER DETAIL TYPES
// ============================================================================

export interface NumberDetailDto {
  id: string;
  phoneNumber: string;
  clientName?: string;
  totalFailedAttempts: number;
  leadStatus: LeadStatus;
  crmStage?: CrmStage;
  lastContactedAt?: string;
  nextActionAt?: string;
  nextActionType?: string;
  lostReason?: string;
  priority?: number;
  poolStatus: NumberPoolStatus;
  cooldownUntil?: string;
  frozenUntil?: string;
  firstCallDate?: string;
  notes?: string;
  activityLogs: NumberActivityLogDto[];
  previousAssignees: { userId: string; email: string; date: string }[];
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    pattern: /^.{8,}$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  amount: {
    min: 0.01,
    max: 9999999.99,
    decimalPlaces: 2,
  },
  description: {
    maxLength: 500,
  },
  reason: {
    minLength: 10,
    maxLength: 500,
  },
  pagination: {
    minPage: 1,
    minLimit: 1,
    maxLimit: 100,
  },
  file: {
    maxSize: 5242880, // 5MB in bytes
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
  },
  customerName: {
    maxLength: 100,
  },
  phoneNumber: {
    pattern: /^[+]?[\d\s-]{7,20}$/,
    maxLength: 20,
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateEmail(email: string): boolean {
  return VALIDATION_RULES.email.pattern.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= VALIDATION_RULES.password.minLength;
}

export function validateAmount(amount: number | string): boolean {
  const { min, max } = VALIDATION_RULES.amount;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return false;
  const decimalPlaces = (numericAmount.toString().split('.')[1] || '').length;
  return numericAmount >= min && numericAmount <= max && decimalPlaces <= 2;
}

export function validateDescription(description: string): boolean {
  return description.length > 0 && description.length <= VALIDATION_RULES.description.maxLength;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes } = VALIDATION_RULES.file;

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be under 5MB' };
  }

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
  }

  return { valid: true };
}
