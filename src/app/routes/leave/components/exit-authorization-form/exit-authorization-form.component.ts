import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';
import { LeaveType, LeaveRequest } from '../../models/leave.model';

@Component({
  selector: 'app-exit-authorization-form',
  templateUrl: './exit-authorization-form.component.html',
  styleUrls: ['./exit-authorization-form.component.scss'],
})
export class ExitAuthorizationFormComponent implements OnInit {
  @Output() submitted = new EventEmitter<void>();

  form!: FormGroup;
  today = new Date();
  submitting = false;
  success = false;
  error = '';

  // Computed duration in minutes (live preview)
  durationMinutes = 0;

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      exitDate:   [null,  Validators.required],
      exitTime:   ['',    [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      returnTime: ['',    [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      reason:     ['',    [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    });

    // Recompute duration when times change
    this.form.valueChanges.subscribe(() => this.computeDuration());
  }

  // ── Duration logic ─────────────────────────────────────────────────────

  private computeDuration(): void {
    const { exitTime, returnTime } = this.form.value;
    if (!exitTime || !returnTime) {
      this.durationMinutes = 0;
      return;
    }
    const [eh, em] = exitTime.split(':').map(Number);
    const [rh, rm] = returnTime.split(':').map(Number);
    const diff = (rh * 60 + rm) - (eh * 60 + em);
    this.durationMinutes = diff > 0 ? diff : 0;
  }

  get durationLabel(): string {
    if (this.durationMinutes <= 0) return '—';
    const h = Math.floor(this.durationMinutes / 60);
    const m = this.durationMinutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  get exceedsMaxDuration(): boolean {
    return this.durationMinutes > 90;   // 1h30 limit per company rules
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    if (this.durationMinutes <= 0) {
      this.error = 'Return time must be after exit time.';
      return;
    }

    this.submitting = true;
    this.error = '';

    const v = this.form.value;
    const dateIso = this.leaveService.toLocalISODate(v.exitDate);

    const payload: LeaveRequest = {
      leaveType:  LeaveType.EXIT_AUTHORIZATION,
      startDate:  dateIso,
      endDate:    dateIso,         // same day
      duration:   0,                // no working-days impact for now
      reason:     v.reason,
      exitTime:   v.exitTime,
      returnTime: v.returnTime,
    };

    this.leaveService.requestLeave(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.success = true;
        this.form.reset();
        this.durationMinutes = 0;
        this.submitted.emit();
      },
      error: err => {
        this.submitting = false;
        this.error = err?.error?.message || 'Failed to submit request. Please try again.';
      },
    });
  }
}