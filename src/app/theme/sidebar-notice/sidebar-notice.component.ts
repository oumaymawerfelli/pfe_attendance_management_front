import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../routes/attendance/services/attendance.service';
import { LeaveService } from '../../routes/leave/services/leave.service';
import { AttendanceSummary } from '../../routes/attendance/models/attendance.model';
import { LeaveRecord } from '../../routes/leave/models/leave.model';

@Component({
  selector: 'app-sidebar-notice',
  templateUrl: './sidebar-notice.component.html',
  styleUrls: ['./sidebar-notice.component.scss'],
})
export class SidebarNoticeComponent implements OnInit {
  // ── Attendance ────────────────────────────────────────────────────────────
  summary: AttendanceSummary | null = null;
  summaryLoading = true;

  // ── Leave ─────────────────────────────────────────────────────────────────
  leaves: LeaveRecord[] = [];
  leavesLoading = true;

  showLeaveForm = false;
  leaveForm: FormGroup;
  submitting = false;
  submitSuccess = false;
  submitError = '';

  leaveTypes = [
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'SICK', label: 'Sick' },
    { value: 'UNPAID', label: 'Unpaid' },
  ];

  today = new Date();

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService
  ) {
    this.leaveForm = this.fb.group({
      leaveType: ['ANNUAL', Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadLeaves();
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  loadSummary(): void {
    this.summaryLoading = true;
    const now = new Date();
    this.attendanceService
      .getMySummary({ month: now.getMonth() + 1, year: now.getFullYear() })
      .subscribe({
        next: s => {
          this.summary = s;
          this.summaryLoading = false;
        },
        error: () => {
          this.summaryLoading = false;
        },
      });
  }

  get checkedInToday(): boolean {
    return !!this.summary?.checkedInToday;
  }

  get checkedOutToday(): boolean {
    return !!this.summary?.checkedOutToday;
  }

  // ── Leave ─────────────────────────────────────────────────────────────────

  loadLeaves(): void {
    this.leavesLoading = true;
    this.leaveService.getMyLeaves().subscribe({
      next: l => {
        this.leaves = l.slice(0, 5);
        this.leavesLoading = false;
      },
      error: () => {
        this.leavesLoading = false;
      },
    });
  }

  toggleLeaveForm(): void {
    this.showLeaveForm = !this.showLeaveForm;
    this.submitSuccess = false;
    this.submitError = '';
    if (!this.showLeaveForm) {
      this.leaveForm.reset({ leaveType: 'ANNUAL' });
    }
  }

  submitLeave(): void {
    if (this.leaveForm.invalid) return;
    this.submitting = true;
    this.submitError = '';
    const v = this.leaveForm.value;
    this.leaveService
      .requestLeave({
        leaveType: v.leaveType,
        startDate: this.fmt(v.startDate),
        endDate: this.fmt(v.endDate),
        reason: v.reason,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.submitSuccess = true;
          this.leaveForm.reset({ leaveType: 'ANNUAL' });
          this.loadLeaves();
          setTimeout(() => {
            this.showLeaveForm = false;
            this.submitSuccess = false;
          }, 2000);
        },
        error: err => {
          this.submitting = false;
          this.submitError = err?.error?.message || 'Failed to submit. Please try again.';
        },
      });
  }

  statusColor(status: string): string {
    return status === 'APPROVED' ? 'primary' : status === 'REJECTED' ? 'warn' : 'accent';
  }

  private fmt(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  get minEndDate(): Date {
    return this.leaveForm.get('startDate')?.value || this.today;
  }
}
