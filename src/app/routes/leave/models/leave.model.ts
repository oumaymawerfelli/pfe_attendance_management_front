// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

/**
 * NEW — replaces raw string for leaveType across all interfaces.
 * Single source of truth; Angular template can iterate LEAVE_TYPE_OPTIONS below.
 */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  UNPAID = 'UNPAID',
    EXIT_AUTHORIZATION = 'EXIT_AUTHORIZATION',   // ← new

}

/**
 * NEW — every possible status in the full approval lifecycle.
 * Replaces the 3-value union on LeaveRecord.
 */
export enum LeaveStatus {
  // Draft (saved but not submitted)
  DRAFT = 'DRAFT',

  // Backend single-step pending (used when no multi-step workflow)
  PENDING = 'PENDING',

  // Multi-step workflow statuses (future use)
  PENDING_TEAM_LEAD = 'PENDING_TEAM_LEAD',
  PENDING_HR        = 'PENDING_HR',
  PENDING_GM        = 'PENDING_GM',

  // Terminal states
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * NEW — the roles that appear in the approval workflow panel.
 * Returned as an ordered array in LeaveSummary.workflow.
 */
export enum WorkflowStep {
  TEAM_LEAD      = 'TEAM_LEAD',
  HR_MANAGER     = 'HR_MANAGER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
}


// ─────────────────────────────────────────────
// PAGE INITIALISATION — GET /api/leave/summary
// ─────────────────────────────────────────────

/**
 * NEW — shape of the response that powers the whole Request Leave page on load.
 * Replaces the need to call separate balance + workflow endpoints.
 */
export interface LeaveSummary {
  annualTotal:     number;
  annualTaken:     number;
  annualRemaining: number;

  sickTotal:     number;
  sickTaken:     number;
  sickRemaining: number;

  unpaidTotal:     number;  // kept for parity; effectively unlimited
  unpaidTaken:     number;
  unpaidRemaining: number;

  /**
   * Ordered list of approvers for this employee.
   * Drives the Approval Workflow panel — no hardcoding in the component.
   */
  workflow: WorkflowStep[];
}


// ─────────────────────────────────────────────
// FORM SUBMIT — POST /api/leave/request
// ─────────────────────────────────────────────

/**
 * UPDATED — now typed with LeaveType enum + duration field.
 * Sent as the JSON part of the multipart/form-data payload.
 * The attachment (File) is appended separately in the service.
 */
export interface LeaveRequest {
  leaveType: LeaveType;   // was: string
  startDate: string;      // ISO date: 'YYYY-MM-DD'
  endDate:   string;
  duration:  number;      // NEW — working days, calculated on the frontend
  reason:    string;
  attachmentType?: string;
    // ── Exit Authorization only ──
  exitTime?:   string;   // 'HH:mm'  — used when leaveType === EXIT_AUTHORIZATION
  returnTime?: string;   // 'HH:mm'
}



// ─────────────────────────────────────────────
// DRAFT SAVE — POST /api/leave/draft
// ─────────────────────────────────────────────

/**
 * NEW — premium draft feature.
 * Identical shape to LeaveRequest so the service can reuse payload-building logic.
 * Backend sets status = DRAFT; user can resume via GET /api/leave/drafts.
 */
export interface LeaveDraft {
  leaveType: LeaveType;
  startDate: string;
  endDate:   string;
  duration:  number;
  reason:    string;
}


// ─────────────────────────────────────────────
// LEAVE RECORD — returned by list/detail endpoints
// ─────────────────────────────────────────────

/**
 * UPDATED — status widened to the full LeaveStatus enum.
 * All other fields kept exactly as they were.
 */
export interface LeaveRecord {
  id: number;

  // Employee
  userId:         number;
  userFullName:   string;
  userDepartment: string;
  userJobTitle?:  string;

  // Leave details
  leaveType:  LeaveType;    // was: string
  startDate:  string;
  endDate:    string;
  daysCount:  number;
  reason:     string;

  // Status — now covers the full workflow lifecycle
  status:           LeaveStatus;   // was: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string;

  // Approval info
  approvedByFullName?: string;
  approvedByRole?:     string;

  createdAt?:  string;
  decidedAt?:  string;

  // Document — non-null once approved and PDF uploaded
  documentPath?: string;
}


// ─────────────────────────────────────────────
// UNCHANGED — kept exactly as they were
// ─────────────────────────────────────────────

export interface LeaveDocumentRequest {
  startDate:       string;
  endDate:         string;
  reason:          string;
  signatureBase64: string;
  approvedBy?:     string;
  approvalDate?:   string;
  
}

export interface LeaveBalance {
  year:             number;
  annualTotal:      number;
  annualTaken:      number;
  annualRemaining:  number;
  sickTotal:        number;
  sickTaken:        number;
  sickRemaining:    number;
  unpaidTotal:      number;
  unpaidTaken:      number;
}


// ─────────────────────────────────────────────
// UI HELPERS — use in templates, not in API calls
// ─────────────────────────────────────────────

/**
 * Drives the three leave-type cards without hardcoding in the component.
 */
export const LEAVE_TYPE_OPTIONS: {
  type:        LeaveType;
  label:       string;
  description: string;
  icon:        string;
}[] = [
  { type: LeaveType.ANNUAL, label: 'Annual Leave', description: '22 days / year', icon: 'beach_access' },
  { type: LeaveType.SICK,   label: 'Sick Leave',   description: '15 days / year', icon: 'thermostat'   },
  { type: LeaveType.UNPAID, label: 'Unpaid Leave', description: 'Unlimited',      icon: 'wallet'        },
];


export const EXIT_AUTH_LABEL = 'Exit Authorization';


/**
 * Maps WorkflowStep enum values to human-readable labels for the approval panel.
 */
export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  [WorkflowStep.TEAM_LEAD]:       'Team Lead',
  [WorkflowStep.HR_MANAGER]:      'HR Manager',
  [WorkflowStep.GENERAL_MANAGER]: 'General Manager',
};

/**
 * Maps LeaveStatus to a display-friendly badge config.
 * color matches your existing badge CSS classes.
 */
export const LEAVE_STATUS_CONFIG: Record<LeaveStatus, { label: string; color: 'gray' | 'amber' | 'green' | 'red' }> = {
  [LeaveStatus.DRAFT]:             { label: 'Draft',            color: 'gray'  },
  [LeaveStatus.PENDING]:           { label: 'Pending',          color: 'amber' },
  [LeaveStatus.PENDING_TEAM_LEAD]: { label: 'Pending',          color: 'amber' },
  [LeaveStatus.PENDING_HR]:        { label: 'Pending HR',       color: 'amber' },
  [LeaveStatus.PENDING_GM]:        { label: 'Pending GM',       color: 'amber' },
  [LeaveStatus.APPROVED]:          { label: 'Approved',         color: 'green' },
  [LeaveStatus.REJECTED]:          { label: 'Rejected',         color: 'red'   },
};