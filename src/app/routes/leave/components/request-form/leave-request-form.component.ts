import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';
import {
  LeaveType,
  WorkflowStep,
  LeaveSummary,
  LeaveRequest,
  LeaveDraft,
  LEAVE_TYPE_OPTIONS,
  WORKFLOW_STEP_LABELS,
} from '../../models/leave.model';

export interface PreviewDay {
  dayName:   string;   // 'Mon'
  dayNum:    string;   // '05'
  isWeekend: boolean;
}

@Component({
  selector: 'app-leave-request-form',
  templateUrl: './leave-request-form.component.html',
  styleUrls: ['./leave-request-form.component.scss'],
})
export class LeaveRequestFormComponent implements OnInit {
  @Output() submitted = new EventEmitter<void>();
  @Output() drafted   = new EventEmitter<void>();

  // ── Expose enums / constants to template ─────────────────────────────────
  readonly LeaveType        = LeaveType;
  readonly leaveTypeOptions = LEAVE_TYPE_OPTIONS;
  readonly workflowLabels   = WORKFLOW_STEP_LABELS;

  // ── Component state ───────────────────────────────────────────────────────
  form!: FormGroup;
  summary:    LeaveSummary | null = null;
  loading    = true;
  submitting = false;
  saving     = false;
  success    = false;
  error      = '';
  today      = new Date();

  // Attachment
  selectedFile: File | null = null;
  isDragging = false;

  // Calculated from date selection
  workingDays = 0;
  previewDays: PreviewDay[] = [];

  constructor(
    private fb:           FormBuilder,
    private leaveService: LeaveService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadSummary();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  private buildForm(): void {
    this.form = this.fb.group({
      leaveType: [LeaveType.ANNUAL, Validators.required],
      startDate: [null,            Validators.required],
      endDate:   [null,            Validators.required],
      halfDay:   [false],
      reason:    ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
    });
  }

  /**
   * Public so the template can call it after "Submit another" resets the form.
   */
  loadSummary(): void {
    this.loading = true;
    this.leaveService.getSummary().subscribe({
      next:  s  => { this.summary = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ── Leave type selection ──────────────────────────────────────────────────

  selectLeaveType(type: LeaveType): void {
    this.form.patchValue({ leaveType: type });
  }

  /**
   * Remaining days for a specific leave type — shown on each card.
   * Returns '∞' for UNPAID since it's unlimited.
   */
  remainingFor(type: LeaveType): number | string {
    if (!this.summary) return '—';
    if (type === LeaveType.ANNUAL) return this.summary.annualRemaining;
    if (type === LeaveType.SICK)   return this.summary.sickRemaining;
    return '∞';
  }

  // ── Summary panel computed values ─────────────────────────────────────────

  get selectedRemaining(): number | null {
    if (!this.summary) return null;
    const t = this.form.value.leaveType as LeaveType;
    if (t === LeaveType.ANNUAL) return this.summary.annualRemaining;
    if (t === LeaveType.SICK)   return this.summary.sickRemaining;
    return null; // UNPAID
  }

  get usedThisYear(): number {
    if (!this.summary) return 0;
    const t = this.form.value.leaveType as LeaveType;
    if (t === LeaveType.ANNUAL) return this.summary.annualTaken;
    if (t === LeaveType.SICK)   return this.summary.sickTaken;
    return 0;
  }

  get totalForType(): number {
    if (!this.summary) return 0;
    const t = this.form.value.leaveType as LeaveType;
    if (t === LeaveType.ANNUAL) return this.summary.annualTotal;
    if (t === LeaveType.SICK)   return this.summary.sickTotal;
    return 0;
  }

  /**
   * Preview of remaining balance if the current request is approved.
   * Returns null for UNPAID (unlimited).
   */
  get remainingAfter(): number | null {
    if (this.selectedRemaining === null) return null;
    return Math.max(0, this.selectedRemaining - this.workingDays);
  }

  // ── Date calculation ──────────────────────────────────────────────────────

  get minEndDate(): Date {
    return this.form.get('startDate')?.value ?? this.today;
  }

  /**
   * Called by both (dateChange) on the pickers and (change) on the half-day toggle.
   * Reads the latest form values each time so no race condition with mat-slide-toggle.
   */
  onDateChange(): void {
    const { startDate, endDate, halfDay } = this.form.value;
    if (!startDate || !endDate) {
      this.workingDays = 0;
      this.previewDays = [];
      return;
    }

    const start = this.leaveService.toLocalISODate(startDate);
    const end   = this.leaveService.toLocalISODate(endDate);

    this.workingDays = this.leaveService.calculateWorkingDays(start, end, halfDay);
    this.previewDays = this.buildPreview(startDate, endDate);
  }

  private buildPreview(start: Date, end: Date): PreviewDay[] {
    const result: PreviewDay[] = [];
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cursor = new Date(start);
    const MAX = 7; // cap the strip so it never overflows

    while (cursor <= end && result.length < MAX) {
      result.push({
        dayName:   DAY_NAMES[cursor.getDay()],
        dayNum:    String(cursor.getDate()).padStart(2, '0'),
        isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  // ── Attachment ────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void { this.isDragging = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile = file;
  }

  removeFile(): void { this.selectedFile = null; }

  get fileSizeMB(): string {
    return this.selectedFile
      ? (this.selectedFile.size / 1_048_576).toFixed(2)
      : '';
  }

  // ── Save Draft ────────────────────────────────────────────────────────────

  saveDraft(): void {
    if (this.saving) return;
    this.saving = true;
    this.error  = '';

    const val = this.form.value;

    const payload: LeaveDraft = {
      leaveType: val.leaveType,
      startDate: val.startDate ? this.leaveService.toLocalISODate(val.startDate) : '',
      endDate:   val.endDate   ? this.leaveService.toLocalISODate(val.endDate)   : '',
      duration:  this.workingDays,
      reason:    val.reason ?? '',
    };

    this.leaveService.saveDraft(payload).subscribe({
      next: () => {
        this.saving = false;
        this.drafted.emit();
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.message || 'Failed to save draft. Please try again.';
      },
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid || this.submitting || this.workingDays === 0) return;

    this.submitting = true;
    this.error      = '';

    const val = this.form.value;

    const payload: LeaveRequest = {
      leaveType: val.leaveType,
      startDate: this.leaveService.toLocalISODate(val.startDate),
      endDate:   this.leaveService.toLocalISODate(val.endDate),
      duration:  this.workingDays,
      reason:    val.reason,
    };

    this.leaveService.requestLeave(payload, this.selectedFile ?? undefined).subscribe({
      next: () => {
        this.submitting  = false;
        this.success     = true;
        this.selectedFile = null;
        this.workingDays  = 0;
        this.previewDays  = [];
        this.form.reset({ leaveType: LeaveType.ANNUAL, halfDay: false });
        this.loadSummary(); // refresh balances in the sidebar after submission
        this.submitted.emit();
      },
      error: err => {
        this.submitting = false;
        this.error = err?.error?.message || 'Failed to submit request. Please try again.';
      },
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  get reasonLength(): number {
    return this.form.get('reason')?.value?.length ?? 0;
  }

  /** Human-readable leave type label for the summary panel. */
  get selectedLeaveLabel(): string {
    return this.leaveTypeOptions.find(o => o.type === this.form.value.leaveType)?.label ?? '';
  }
}