export interface LeaveRecord {
  id: number;

  // Employee
  userId: number;
  userFullName: string;
  userDepartment: string;
  userJobTitle?: string;

  // Leave details
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;

  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;

  // Approval info — matches LeaveResponseDTO field names
  approvedByFullName?: string;
  approvedByRole?: string;

  createdAt?: string;
  decidedAt?: string;

  // Document — non-null once approved and PDF uploaded
  documentPath?: string;
}

export interface LeaveRequest {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveBalance {
  year: number;
  annualTotal: number;
  annualTaken: number;
  annualRemaining: number;
  sickTotal: number;
  sickTaken: number;
  sickRemaining: number;
  unpaidTotal: number;
  unpaidTaken: number;
}
