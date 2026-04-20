import { Component, Inject, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import SignaturePad from 'signature_pad';
import { LeaveRecord } from '../../models/leave.model';
import { LeaveService } from '../../services/leave.service';

import { AuthService } from '@core/authentication/auth.service';

import { LeavePdfService } from '../../services/leave-pdf.service';
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
    private authService: AuthService,
    private pdfService: LeavePdfService
  ) {
    this.leave = data.leave;
    this.mode = data.mode;
    this.isPM = data.isPM ?? false;
  }
  logoBase64 = '';

  ngOnInit(): void {
    this.loadLogo();
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

  private loadLogo(): void {
    fetch('assets/images/image.png')
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => (this.logoBase64 = reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => console.warn('Logo not found'));
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
      backgroundColor: '#ffffff',
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

    approve$
      .pipe(
        // Step 2: generate PDF blob + upload to backend
        switchMap(updated => {
          const blob = this.buildPdfBlob(updated);
          return this.leaveService.uploadDocument(this.leave.id, blob).pipe(
            // Pass the updated leave record through for the close event
            switchMap(() => [updated])
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: updated => {
          // Step 3: also trigger local download for the approver
          this.downloadLocalCopy(updated);
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

  // ── PDF helpers ───────────────────────────────────────────────────────────

  /** Build the PDF and return it as a Blob (for uploading to the backend). */
  private buildPdfBlob(updated: LeaveRecord): Blob {
    return this.pdfService.generateBlob({
      leaveId: this.leave.id,
      employeeFullName: updated.userFullName ?? this.leave.userFullName ?? '—',
      employeeDepartment: updated.userDepartment ?? this.leave.userDepartment ?? '—',
      employeeJobTitle: (updated as any).userJobTitle ?? (this.leave as any).userJobTitle,
      leaveType: updated.leaveType ?? this.leave.leaveType,
      startDate: this.fmtDate(updated.startDate ?? this.leave.startDate),
      endDate: this.fmtDate(updated.endDate ?? this.leave.endDate),
      daysCount: updated.daysCount ?? this.leave.daysCount,
      reason: updated.reason ?? this.leave.reason ?? '—',
      requestDate: this.fmtDate(this.leave.createdAt),
      approverFullName: this.approverFullName,
      approverRole: this.approverRole,
      approvalDate: this.fmtDate(new Date().toISOString()),
      signatureDataUrl: this.signaturePad.toDataURL('image/png'),
      companyName: 'Your Company Name',
      companyEmail: 'hr@yourcompany.com',
      companyPhone: '+216 XX XXX XXX',
      companyAddress: 'Tunis, Tunisia',
    });
  }

  /** Triggers a local download for the approver's own copy. */
  private downloadLocalCopy(updated: LeaveRecord): void {
    this.pdfService.generateAndDownload({
      leaveId: this.leave.id,
      employeeFullName: updated.userFullName ?? this.leave.userFullName ?? '—',
      employeeDepartment: updated.userDepartment ?? this.leave.userDepartment ?? '—',
      employeeJobTitle: (updated as any).userJobTitle ?? (this.leave as any).userJobTitle,
      leaveType: updated.leaveType ?? this.leave.leaveType,
      startDate: this.fmtDate(updated.startDate ?? this.leave.startDate),
      endDate: this.fmtDate(updated.endDate ?? this.leave.endDate),
      daysCount: updated.daysCount ?? this.leave.daysCount,
      reason: updated.reason ?? this.leave.reason ?? '—',
      requestDate: this.fmtDate(this.leave.createdAt),
      approverFullName: this.approverFullName,
      approverRole: this.approverRole,
      approvalDate: this.fmtDate(new Date().toISOString()),
      signatureDataUrl: this.signaturePad.toDataURL('image/png'),
      companyName: 'ArabSoft',
      companyEmail: 'hr@yourcompany.com',
      companyPhone: '+216 XX XXX XXX',
      companyAddress: 'Tunis, Tunisia',
      companyLogo: this.logoBase64,
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  typeLabel(t: string): string {
    return ({ ANNUAL: 'Annual Leave', SICK: 'Sick Leave', UNPAID: 'Unpaid Leave' } as any)[t] ?? t;
  }

  statusColor(s: string): string {
    return ({ PENDING: 'accent', APPROVED: 'primary', REJECTED: 'warn' } as any)[s] ?? '';
  }

  private fmtDate(raw: string | Date | undefined): string {
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return String(raw);
    }
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
