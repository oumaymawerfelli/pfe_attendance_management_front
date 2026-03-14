import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';

@Component({
  selector: 'app-leave-request-form',
  templateUrl: './leave-request-form.component.html',
  styleUrls: ['./leave-request-form.component.scss'],
})
export class LeaveRequestFormComponent {
  @Output() submitted = new EventEmitter<void>();

  form: FormGroup;
  submitting = false;
  success = false;
  error = '';
  today = new Date();

  leaveTypes = [
    { value: 'ANNUAL', label: 'Annual Leave',  icon: 'beach_access'   },
    { value: 'SICK',   label: 'Sick Leave',    icon: 'local_hospital' },
    { value: 'UNPAID', label: 'Unpaid Leave',  icon: 'money_off'      },
  ];

  constructor(private fb: FormBuilder, private leaveService: LeaveService) {
    this.form = this.fb.group({
      leaveType:  ['ANNUAL', Validators.required],
      startDate:  [null, Validators.required],
      endDate:    [null, Validators.required],
      reason:     ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  get minEndDate(): Date {
    return this.form.get('startDate')?.value || new Date();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

    const val = this.form.value;
    const payload = {
      leaveType: val.leaveType,
      startDate: this.formatDate(val.startDate),
      endDate:   this.formatDate(val.endDate),
      reason:    val.reason,
    };

    this.leaveService.requestLeave(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.success = true;
        this.form.reset({ leaveType: 'ANNUAL' });
        this.submitted.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || 'Failed to submit request. Please try again.';
      },
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}