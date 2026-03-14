export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveRecord {
  id: number;
  userId: number;
  userFullName: string;
  userDepartment: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  approvedByFullName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
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