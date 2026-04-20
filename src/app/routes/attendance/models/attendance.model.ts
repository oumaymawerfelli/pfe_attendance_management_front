export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';

export interface AttendanceRecord {
  id: number;
  userId: number;
  userFullName: string;
  userDepartment: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: AttendanceStatus;
  workDuration: number | null;
  overtimeHours: number;
  notes: string | null;
  userEmail?: string;
}

export interface DailyHours {
  day: string;
  workedHours: number;
  overtimeHours: number;
  status: string;
}

export interface AttendanceSummary {
  leaveDays: any;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  dailyHours: DailyHours[];
  checkedInToday: boolean;
  checkedOutToday: boolean;
}

export interface AttendanceFilter {
  month?: number;
  year?: number;
}
