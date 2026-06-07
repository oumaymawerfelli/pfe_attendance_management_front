import {
  Component, Inject, OnInit, OnDestroy,
  ViewChild, ElementRef,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { Subject, switchMap, map, takeUntil } from 'rxjs';
import SignaturePad from 'signature_pad';
import { DocumentService } from '../../../admin/services/document.service';
import { LeaveDocument }   from '../../../admin/models/leave-document.model';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '@core/authentication/auth.service';
import { LeavePdfService, LeaveDocumentData } from '../../services/leave-pdf.service';
import {
  LeaveRecord,
  LeaveStatus,
  LeaveType,
  LEAVE_STATUS_CONFIG,
  LEAVE_TYPE_OPTIONS,
} from '../../models/leave.model';

// ── Dialog data contract ──────────────────────────────────────────────────────

export interface LeaveDetailDialogData {
  leave: LeaveRecord;
  /**
   * 'view'   — employee sees their own record (read-only, no action buttons)
   * 'decide' — manager sees the record and can approve or reject
   */
  mode:  'view' | 'decide';
  /**
   * When true the component calls approveTeamLeave / rejectTeamLeave
   * (Project Manager endpoint). Otherwise it calls the GM/Admin endpoints.
   */
  isPM?: boolean;
}

// ── Result shape (consumed by the parent via afterClosed()) ───────────────────

export interface LeaveDetailDialogResult {
  action: 'approved' | 'rejected';
  leave:  LeaveRecord;
}

@Component({
  selector: 'app-leave-detail-dialog',
  templateUrl: './leave-detail-dialog.component.html',
  styleUrls: ['./leave-detail-dialog.component.scss'],
})
export class LeaveDetailDialogComponent implements OnInit, OnDestroy {

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  leave: LeaveRecord;
  mode:  'view' | 'decide';
  isPM:  boolean;

  approverFullName = '';
  approverRole     = '';

  step: 'review' | 'sign' = 'review';
  rejecting = false;
  saving    = false;
  error     = '';

  rejectionReason = new FormControl('', Validators.required);

  readonly LeaveStatus      = LeaveStatus;
  readonly statusConfig     = LEAVE_STATUS_CONFIG;
  readonly leaveTypeOptions = LEAVE_TYPE_OPTIONS;

  private readonly PENDING_STATUSES = new Set<LeaveStatus>([
    LeaveStatus.PENDING,            // backend single-step status
    LeaveStatus.PENDING_TEAM_LEAD,
    LeaveStatus.PENDING_HR,
    LeaveStatus.PENDING_GM,
  ]);

  private signaturePad!: SignaturePad;
  private destroy$ = new Subject<void>();

  documents: LeaveDocument[] = [];
loadingDocs = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LeaveDetailDialogData,
    private dialogRef: MatDialogRef<LeaveDetailDialogComponent, LeaveDetailDialogResult | null>,
    private leaveService: LeaveService,
    private authService: AuthService,
    private documentService: DocumentService,
    private pdfService: LeavePdfService,
  ) {
    this.leave = data.leave;
    this.mode  = data.mode  ?? 'view';
    this.isPM  = data.isPM  ?? false;
  }

  ngOnInit(): void {
    this.loadDocuments();
    this.authService.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.approverFullName =
          `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

        const rawRoles: string[] = (user?.roles ?? []).map((r: any) =>
          typeof r === 'string' ? r : (r?.name ?? ''),
        );
        this.approverRole = this.formatRole(rawRoles[0] ?? '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed state ────────────────────────────────────────────────────────

  /**
   * Approve/reject buttons are shown only when:
   *  1. The dialog was opened in 'decide' mode (manager), AND
   *  2. The leave is still in an actionable pending state.
   * An already-approved or rejected record has nothing left to decide.
   */
  get canDecide(): boolean {
    return (
      this.mode === 'decide' &&
      this.PENDING_STATUSES.has(this.leave.status )
    );
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  goToSign(): void {
    this.step  = 'sign';
    this.error = '';
    setTimeout(() => this.initSignaturePad(), 60);
  }

  backToReview(): void {
    this.step      = 'review';
    this.error     = '';
    this.rejecting = false;
  }

  // ── Signature pad ─────────────────────────────────────────────────────────

  private initSignaturePad(): void {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const ratio  = Math.max(window.devicePixelRatio ?? 1, 1);

    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')!.scale(ratio, ratio);

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor:        '#1a2e44',
    });
  }

  clearSignature(): void { this.signaturePad?.clear(); }

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
  this.error  = '';

  const signatureBase64 = this.signaturePad.toDataURL('image/png');

  const approve$ = this.isPM
    ? this.leaveService.approveTeamLeave(this.leave.id)
    : this.leaveService.approveLeave(this.leave.id);

  approve$.pipe(
    switchMap(updated => {
      // Generate the PDF blob on the frontend
      const pdfBlob = this.pdfService.generateBlob({
        leaveId:            this.leave.id,
        employeeFullName:   this.leave.userFullName,
        employeeDepartment: this.leave.userDepartment ?? '—',
        employeeJobTitle:   this.leave.userJobTitle,
        leaveType:          this.leave.leaveType,
        startDate:          updated.startDate ?? this.leave.startDate,
        endDate:            updated.endDate   ?? this.leave.endDate,
        daysCount:          this.leave.daysCount,
        reason:             this.leave.reason ?? '—',
        requestDate:        this.leave.startDate,
        approverFullName:   this.approverFullName,
        approverRole:       this.approverRole,
        approvalDate:       new Date().toISOString().split('T')[0],
        signatureDataUrl:   signatureBase64,
        companyName:        'Arab Soft',   // ← your company name
      });

      // Upload to backend — saves to leave_documents table
      return this.leaveService.uploadAuthorizationLetter(this.leave.id, pdfBlob).pipe(
  map(() => updated)
);
    }),
    takeUntil(this.destroy$),
  ).subscribe({
    next: updated => {
      // Also trigger browser download
      this.pdfService.generateAndDownload({
        leaveId:            this.leave.id,
        employeeFullName:   this.leave.userFullName,
        employeeDepartment: this.leave.userDepartment ?? '—',
        leaveType:          this.leave.leaveType,
        startDate:          updated.startDate ?? this.leave.startDate,
        endDate:            updated.endDate   ?? this.leave.endDate,
        daysCount:          this.leave.daysCount,
        reason:             this.leave.reason ?? '—',
        requestDate:        this.leave.startDate,
        approverFullName:   this.approverFullName,
        approverRole:       this.approverRole,
        approvalDate:       new Date().toISOString().split('T')[0],
        signatureDataUrl:   signatureBase64,
        companyName:        'Arab Soft',
      });
      this.dialogRef.close({ action: 'approved', leave: updated });
    },
    error: err => {
      this.error  = err?.error?.message || 'Approval failed. Please try again.';
      this.saving = false;
    },
  });
}

  // ── Reject flow ───────────────────────────────────────────────────────────

  showRejectForm(): void { this.rejecting = true; }

  confirmReject(): void {
    if (this.rejectionReason.invalid) return;

    this.saving = true;
    this.error  = '';

    const reason   = this.rejectionReason.value!;
    const request$ = this.isPM
      ? this.leaveService.rejectTeamLeave(this.leave.id, reason)
      : this.leaveService.rejectLeave(this.leave.id, reason);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next:  updated => this.dialogRef.close({ action: 'rejected', leave: updated }),
      error: err => {
        this.error  = err?.error?.message || 'Rejection failed. Please try again.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.dialogRef.close(null); }

  downloadLetter(): void { this.leaveService.openDocument(this.leave.id); }

  // ── Template helpers ──────────────────────────────────────────────────────

  typeLabel(type: LeaveType | string): string {
    return this.leaveTypeOptions.find(o => o.type === type)?.label ?? String(type);
  }

  /** Returns a CSS modifier class: gray | amber | green | red */
  statusClass(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.color ?? 'gray';
  }

  /** Returns a human-readable label: "Pending HR", "Approved", etc. */
  statusLabel(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.label ?? String(status);
  }

  isPending(status: LeaveStatus | string): boolean {
    return this.PENDING_STATUSES.has(status as LeaveStatus);
  }

  private formatRole(role: string): string {
    const labels: Record<string, string> = {
      ADMIN:           'Administrator',
      GENERAL_MANAGER: 'General Manager',
      PROJECT_MANAGER: 'Project Manager',
      EMPLOYEE:        'Employee',
    };
    return labels[role.replace(/^ROLE_/, '')] ?? role;
  }

  private loadDocuments(): void {
  this.loadingDocs = true;
  this.documentService.getMyDocuments({ leaveRequestId: this.leave.id })
    .subscribe({
      next:  page => { this.documents = page.content; this.loadingDocs = false; },
      error: ()   => { this.loadingDocs = false; },
    });
}

downloadDoc(doc: LeaveDocument): void {
  this.documentService.download(doc.id).subscribe({
    next: response => {
      this.documentService.triggerDownload(response.body!, doc.fileName);
    }
  });
}

previewDoc(doc: LeaveDocument): void {
  this.documentService.download(doc.id).subscribe({
    next: response => {
      const blob = response.body!;
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');   // ← opens in new tab
    }
  });
}
formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
}