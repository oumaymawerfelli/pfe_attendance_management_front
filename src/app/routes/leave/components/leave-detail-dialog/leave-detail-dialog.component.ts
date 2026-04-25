import { Component, Inject, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import SignaturePad from 'signature_pad';
import { LeaveRecord } from '../../models/leave.model';
import { LeaveService } from '../../services/leave.service';
import { AuthService } from '@core/authentication/auth.service';
import { Subject, takeUntil, switchMap } from 'rxjs';

export interface LeaveDetailDialogData {
  leave: LeaveRecord;
  mode: 'view' | 'decide';
  isPM: boolean;
}

@Component({
  selector: 'app-leave-detail-dialog',
  templateUrl: './leave-detail-dialog.component.html',
  styleUrls: ['./leave-detail-dialog.component.scss'],
})
export class LeaveDetailDialogComponent implements OnInit, OnDestroy {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  leave: LeaveRecord;
  mode: 'view' | 'decide';
  isPM: boolean;

  approverFullName = '';
  approverRole = '';

  step: 'review' | 'sign' = 'review';
  rejecting = false;
  saving = false;
  error = '';

  rejectionReason = new FormControl('', Validators.required);

  private signaturePad!: SignaturePad;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LeaveDetailDialogData,
    private dialogRef: MatDialogRef<LeaveDetailDialogComponent>,
    private leaveService: LeaveService,
    private authService: AuthService
  ) {
    this.leave = data.leave;
    this.mode = data.mode;
    this.isPM = data.isPM ?? false;
  }

  ngOnInit(): void {
    this.authService
      .user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.approverFullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
        const rawRoles: string[] = (user?.roles ?? []).map((r: any) =>
          typeof r === 'string' ? r : r?.name ?? ''
        );
        const cleanRoles = rawRoles.map(r => r.replace(/^ROLE_/, ''));
        this.approverRole = this.formatRole(cleanRoles[0] ?? '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  goToSign(): void {
    this.step = 'sign';
    this.error = '';
    setTimeout(() => this.initSignaturePad(), 60);
  }

  backToReview(): void {
    this.step = 'review';
    this.error = '';
    this.rejecting = false;
  }

  // ── Signature pad ─────────────────────────────────────────────────────────

  private initSignaturePad(): void {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')!.scale(ratio, ratio);
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1a2e44',
    });
  }

  clearSignature(): void {
    this.signaturePad?.clear();
  }

  private isSignatureEmpty(): boolean {
    return !this.signaturePad || this.signaturePad.isEmpty();
  }

  // ── Approve flow ──────────────────────────────────────────────────────────

  confirmApprove(): void {
    if (this.isSignatureEmpty()) {
      this.error = 'Please draw your signature before approving.';
      return;
    }
    this.saving = true;
    this.error = '';

    // Step 1: approve on backend
    const approve$ = this.isPM
      ? this.leaveService.approveTeamLeave(this.leave.id)
      : this.leaveService.approveLeave(this.leave.id);

    const signatureBase64 = this.signaturePad.toDataURL('image/png');

    approve$
      .pipe(
        switchMap(updated =>
          this.leaveService
            .generateDocument(this.leave.id, {
              startDate: updated.startDate ?? this.leave.startDate,
              endDate: updated.endDate ?? this.leave.endDate,
              reason: updated.reason ?? this.leave.reason ?? '',
              signatureBase64,
              approvedBy: this.approverFullName,
              approvalDate: new Date().toISOString().split('T')[0],
            })
            .pipe(switchMap(() => [updated]))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: updated => {
          this.leaveService.openDocument(this.leave.id);
          this.dialogRef.close({ action: 'approved', leave: updated });
        },
        error: err => {
          this.error = err?.error?.message || 'Approval failed. Please try again.';
          this.saving = false;
        },
      });
  }

  // ── Reject flow ───────────────────────────────────────────────────────────

  showRejectForm(): void {
    this.rejecting = true;
  }

  confirmReject(): void {
    if (this.rejectionReason.invalid) return;
    this.saving = true;
    this.error = '';

    const request$ = this.isPM
      ? this.leaveService.rejectTeamLeave(this.leave.id, this.rejectionReason.value!)
      : this.leaveService.rejectLeave(this.leave.id, this.rejectionReason.value!);

    request$.subscribe({
      next: updated => this.dialogRef.close({ action: 'rejected', leave: updated }),
      error: err => {
        this.error = err?.error?.message || 'Rejection failed.';
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  typeLabel(t: string): string {
    return ({ ANNUAL: 'Annual Leave', SICK: 'Sick Leave', UNPAID: 'Unpaid Leave' } as any)[t] ?? t;
  }

  statusColor(s: string): string {
    return ({ PENDING: 'accent', APPROVED: 'primary', REJECTED: 'warn' } as any)[s] ?? '';
  }

  private formatRole(role: string): string {
    const clean = role.replace(/^ROLE_/, '');
    return (
      (
        {
          ADMIN: 'Administrator',
          GENERAL_MANAGER: 'General Manager',
          PROJECT_MANAGER: 'Project Manager',
          EMPLOYEE: 'Employee',
        } as any
      )[clean] ?? clean
    );
  }
}
