import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AttendanceRecord } from '../../models/attendance.model';

export interface DayDetailDialogData {
  date: string; // ISO string e.g. '2025-04-08'
  dateLabel: string; // e.g. 'Tuesday, 08 April 2025'
  calStatus: string; // calendar cell status: 'present' | 'late' | 'absent' | 'leave' | 'weekend' ...
  record: AttendanceRecord | null; // null = no record (absent/weekend/future)
  loading: boolean;
  error: string;
}

@Component({
  selector: 'app-day-detail-dialog',
  templateUrl: './day-detail-dialog.component.html',
  styleUrls: ['./day-detail-dialog.component.scss'],
})
export class DayDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DayDetailDialogData) {}

  get hasRecord(): boolean {
    return !!this.data.record && !this.data.loading && !this.data.error;
  }

  get statusConfig(): { label: string; color: string; icon: string } {
    const map: Record<string, { label: string; color: string; icon: string }> = {
      PRESENT: { label: 'Present', color: '#27ae60', icon: 'check_circle' },
      LATE: { label: 'Late Arrival', color: '#f39c12', icon: 'schedule' },
      ABSENT: { label: 'Absent', color: '#e74c3c', icon: 'cancel' },
      HALF_DAY: { label: 'Half Day', color: '#8e44ad', icon: 'timelapse' },
      EARLY_DEPARTURE: { label: 'Early Departure', color: '#e67e22', icon: 'logout' },
      LEAVE: { label: 'On Approved Leave', color: '#2e86de', icon: 'beach_access' },
    };
    const status = this.data.record?.status ?? this.data.calStatus.toUpperCase();
    return map[status] ?? { label: status, color: '#607d8b', icon: 'help_outline' };
  }

  formatTime(dt: string | null | undefined): string {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }

  formatHours(h: number | null | undefined): string {
    if (h == null) return '—';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
}
